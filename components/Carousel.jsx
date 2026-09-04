"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import gsap from "gsap";

import BrandMark from "./BrandMark";
import { useSharedTransition } from "./SharedTransitionProvider";

import {
  vertexShader,
  fragmentShader,
  MAX_PLANES,
  MAX_LINKS,
} from "./shaders/planeShaders";
import { buildAtlas } from "./ring/atlas";
import { createMeta } from "./ring/meta";
import { createSplitText } from "./ring/splitText";
import { createTag, TAG_W, TAG_H } from "./ring/tag";
import { defaultParams } from "./ring/params";
import { PROJECTS as FALLBACK_PROJECTS } from "./ring/projects";
import { projectImageSrc } from "@/lib/projects";
import {
  TAU,
  HALF_PI,
  DEG,
  chase,
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  signedOffset,
  smoothstep,
  radiusForCount,
} from "./ring/utils";

// The fan starts fractionally into the spread so the seed reads first.
const FAN_START = 0.06;

const blankTexture = () => {
  const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
};

export default function Carousel({
  projects = FALLBACK_PROJECTS,
  active = true,
}) {
  const ring = projects.length > 0 ? projects : FALLBACK_PROJECTS;
  const ringKey = ring.map((p) => `${p.slug ?? ""}:${p.file}`).join("|");
  const router = useRouter();
  const startTransition = useSharedTransition()?.start;
  const activeRef = useRef(active);
  const routerRef = useRef(router);
  const startTransitionRef = useRef(startTransition);
  const pickProjectRef = useRef(null);
  const stageApiRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const itemsRef = useRef([]);
  const loaderRef = useRef(null);
  const liveRef = useRef(null);
  const cutRef = useRef(null);
  // Per side: the box that positions the lockup, the filtered wrapper the goo
  // happens inside, the two rows that melt within it, and one more row outside
  // for words carrying over unchanged. See ring/meta.js.
  const metaRef = useRef({
    left: { box: null, goo: null, layers: [], plain: null },
    right: { box: null, goo: null, layers: [], plain: null },
  });

  useEffect(() => {
    activeRef.current = active;
    routerRef.current = router;
    startTransitionRef.current = startTransition;
  }, [active, router, startTransition]);

  useEffect(() => {
    stageApiRef.current?.(active);
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    const listEl = listRef.current;
    const loaderEl = loaderRef.current;
    // Async work (atlas decode, the lil-gui import) can land after cleanup
    // under StrictMode's double mount. Everything deferred checks this.
    let disposed = false;

    const params = defaultParams();
    const imageFiles = ring.map((project) => project.file);
    params.count = Math.min(MAX_PLANES, ring.length);
    params.atlasLaunch = Math.min(params.atlasLaunch, ring.length);
    // progress: the seed is born at screen centre
    // launch:   the seed travels out to its place on the ring
    // spread:   the rest peel off it and the ring draws
    // spin:     whole-ring rotation, radians
    // shift:    the ring moves off centre and resizes
    const state = { progress: 0, launch: 0, spread: 0, spin: 0, shift: 0 };
    // Read-only panel readouts, so an invalid ring is visible rather than
    // silent and the reference window can be matched to the live one.
    const info = {
      restingGap: 0,
      window: "",
      scale: 1,
      band: "wide",
      quality: "hi",
    };

    const coarseMQ = window.matchMedia("(pointer: coarse)");
    const loFiNow = (width = window.innerWidth) =>
      coarseMQ.matches || width <= params.loFiAt;
    let loFi = loFiNow();

    // ring-lock is applied in applyStage once the effect has a renderer, and
    // only while this instance is the visible home — parking must not freeze
    // scroll on a project page.

    // Browsers cap the number of live WebGL contexts (~16 in Chrome). If that
    // is hit, this throws and the rest of the effect never runs — no canvas is
    // appended and the page is simply blank, which is a miserable thing to
    // debug. Fail loudly instead. See the cleanup for why it should not
    // happen: the context is released explicitly rather than left to GC.
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // The field already antialiases through fwidth. MSAA on a full-screen
        // pass that discards empty pixels is what made the swipe hitch.
        antialias: false,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.error("[ring] could not create a WebGL context:", err);
      document.documentElement.classList.remove("ring-lock");
      return;
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, loFi ? params.dprCapLo : params.dprCap),
    );
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);
    const canvas = renderer.domElement;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);

    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uSize: { value: new THREE.Vector2(150, 100) },
      uRadius: { value: params.radius },
      uCount: { value: params.count },
      uPos: {
        value: Array.from({ length: MAX_PLANES }, () => new THREE.Vector2()),
      },
      uRot: { value: new Float32Array(MAX_PLANES) },
      // xy = birth scale, z = brightness, w = atlas cell. Packed because a
      // uniform array costs a full vec4 row per element either way.
      uScale: {
        value: Array.from(
          { length: MAX_PLANES },
          () => new THREE.Vector4(0, 0, 1, 0),
        ),
      },
      uLinkCount: { value: 0 },
      uLinkA: {
        value: Array.from({ length: MAX_LINKS }, () => new THREE.Vector2()),
      },
      uLinkB: {
        value: Array.from({ length: MAX_LINKS }, () => new THREE.Vector2()),
      },
      // (rEnd, rMid, sag, fillet), packed to stay inside the uniform budget.
      uLinkPar: {
        value: Array.from({ length: MAX_LINKS }, () => new THREE.Vector4()),
      },
      uK: { value: params.goo },
      uWobble: { value: params.wobble },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#0a0a0a") },
      uAtlas: { value: blankTexture() }, // placeholder so the sampler is bound
      uGrid: { value: new THREE.Vector2(1, 1) },
      uBlend: { value: params.blend },
      uTextured: { value: 0 },
      uBound: { value: new THREE.Vector4() },
      uBandTop: { value: 0 },
      uBandBottom: { value: 0 },
      uGlass: { value: new THREE.Vector4() },
      uFringe: { value: 0 },
      uSheen: { value: 0 },
      uMouse: { value: new THREE.Vector4() },
      uMelt: { value: new THREE.Vector4() },
      uTagTex: {
        value: new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1),
      },
      uTag: { value: new THREE.Vector4() },
      uTagP: { value: new THREE.Vector4() },
      uTagQ: { value: new THREE.Vector4() },
      uPage: { value: new THREE.Color("#fafafa") },
    };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
      }),
    );
    // Above the type, so the planes occlude it as the ring sweeps past.
    mesh.renderOrder = 10;
    mesh.frustumCulled = false;
    scene.add(mesh);

    const textGroup = new THREE.Group();
    scene.add(textGroup);

    const splitText = createSplitText(textGroup, params);
    const tag = createTag(params, uniforms);
    const meta = createMeta(
      {
        groups: metaRef.current,
        list: listEl,
        loader: loaderEl,
        cut: cutRef.current,
        live: liveRef.current,
      },
      params,
      ring,
    );

    /* ---------------------------------------------------------------- art */
    // The atlas is bound on frame one and fills in as images arrive, so the
    // seed can be born already wearing its own art while the rest are still
    // in flight. It is also what gives the counter something to count.
    let firstIn = false; // the seed's own cell is on the texture
    let loadProg = 0; // and how much of the rest has arrived, 0..1

    // Opened on the frame the counter reads 100, and by nothing else — that is
    // what makes the number landing and the ring launching the same moment.
    let launchReady = false;
    const readyWaiters = [];
    const whenReady = (fn) => (launchReady ? fn() : readyWaiters.push(fn));

    const atlas = buildAtlas(
      imageFiles,
      (p) => {
        if (!disposed) loadProg = p;
      },
      {
        launchAt: Math.min(imageFiles.length, params.atlasLaunch),
      },
    );

    uniforms.uAtlas.value.dispose();
    atlas.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    uniforms.uAtlas.value = atlas.texture;
    uniforms.uGrid.value.set(atlas.grid[0], atlas.grid[1]);
    // Up front, not on completion: the cell each plane wears is derived from
    // this and has to be right from the first frame, blank cells or not.
    const imageCount = atlas.count;
    // Art is dealt by ring slot, not plane index. Planes are numbered in fan
    // order, so dealing by index puts every other project side by side and
    // steps the column two names per slot. Negated because turning the ring
    // forward walks the front slot backwards. The offset is read at call time
    // because the dev panel can rotate the deal live.
    const cellOf = (slot) => {
      const imgOff = Math.round(params.imageOffset);
      return imageCount > 0
        ? (((imgOff - slot) % imageCount) + imageCount) % imageCount
        : 0;
    };

    atlas.first.then(() => {
      if (!disposed) firstIn = true;
    });
    atlas.ready.then(() => {
      if (!disposed) loadProg = 1;
    });
    // Notion covers used to hang for a minute; the timeline pause then left
    // CHARGING on 001. Open anyway so a bad/slow image cannot freeze the page.
    const launchTimer = window.setTimeout(() => {
      if (disposed || launchReady) return;
      loadProg = 1;
      launchReady = true;
      for (const fn of readyWaiters) fn();
      readyWaiters.length = 0;
    }, 1800);

    /* --------------------------------------------------------------- size */
    let viewW = 1;
    let viewH = 1;
    let fitW = 0;
    let fitH = 0;
    // Cached: the pointer is tracked on every move, and reading the rect each
    // time is a forced layout. Only a resize can invalidate it.
    const bounds = { left: 0, top: 0 };

    // How far this window is from the reference one. Every px param is
    // multiplied through by it, so it is computed on resize and never in the
    // loop. planeK / radiusK / textK are the breakpoint bumps on top.
    let fit = 1;
    let planeK = 1;
    let radiusK = 1;
    let textK = 1;
    // Kept as flags rather than resolved into values here, so anything picked
    // off them still answers to the dev panel between resizes.
    let narrowNow = false;
    let tightNow = false;

    const refit = () => {
      const byW = viewW / Math.max(1, params.refWidth);
      const byH = viewH / Math.max(1, params.refHeight);
      const s =
        byW * (1 - params.fitHeight) + Math.min(byW, byH) * params.fitHeight;
      fit = Math.min(params.maxScale, Math.max(params.minScale, s));

      const narrow = viewW <= params.narrowAt;
      const tight = viewW <= params.tightAt;
      narrowNow = narrow;
      tightNow = tight;
      planeK = narrow ? params.narrowPlane : 1;
      // The bands stack: tight sits inside narrow and pulls the arc back in
      // from where narrow had pushed it out to.
      radiusK =
        (narrow ? params.narrowRadius : 1) * (tight ? params.tightRadius : 1);
      textK = narrow ? params.narrowText : 1;

      info.window = `${Math.round(viewW)} x ${Math.round(viewH)}`;
      info.scale = Math.round(fit * 1000) / 1000;
      info.band = tight ? "tight" : narrow ? "narrow" : "wide";
      info.quality = loFi ? "lo" : "hi";

      // The heading is rasterised per glyph, so it cannot be re-sized without
      // rebuilding every texture mid-animation. Scaling the group costs
      // nothing and stays sharp — the glyphs are drawn at 2x display already.
      const k = fit * textK * (tight ? params.tightSplit : 1);
      textGroup.scale.set(k, k, 1);
    };

    const styleMeta = () =>
      meta.style({ textK, tight: tightNow, viewW: viewW });

    // Declared before resize: the URL-bar path reads these so it must not
    // move the drag origin, and the first resize() runs before input setup.
    let pressing = false;
    let dragging = false;

    const applyQuality = () => {
      loFi = loFiNow(viewW);
      info.quality = loFi ? "lo" : "hi";
      const cap = loFi ? params.dprCapLo : params.dprCap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
      if (atlas.texture) {
        atlas.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    };

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      // iOS URL-bar show/hide is a ~50px height jitter. Rebuilding the GL
      // surface for that is the hitch you feel mid-swipe.
      if (fitW && Math.abs(w - fitW) < 2 && Math.abs(h - fitH) < 120) {
        // URL-bar show/hide must not move the drag origin mid-swipe.
        if (!pressing && !dragging) {
          const rect = renderer.domElement.getBoundingClientRect();
          bounds.left = rect.left;
          bounds.top = rect.top;
        }
        return;
      }
      fitW = w;
      fitH = h;
      viewW = w;
      viewH = h;
      refit();
      applyQuality();
      renderer.setSize(viewW, viewH);
      camera.left = -viewW / 2;
      camera.right = viewW / 2;
      camera.top = viewH / 2;
      camera.bottom = -viewH / 2;
      camera.updateProjectionMatrix();
      mesh.scale.set(viewW, viewH, 1);
      uniforms.uResolution.value.set(viewW, viewH);

      const rect = renderer.domElement.getBoundingClientRect();
      bounds.left = rect.left;
      bounds.top = rect.top;
    };

    // styleMeta too, because the breakpoint bumps are steps that vw units
    // cannot express on their own. URL-bar jitter must not abort a pick
    // that is already turning toward the tapped card.
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const chromeOnly =
        fitW && Math.abs(w - fitW) < 2 && Math.abs(h - fitH) < 120;
      if (!chromeOnly) cancelPendingOpen();
      resize();
      styleMeta();
    };

    const syncBounds = () => {
      const rect = canvas.getBoundingClientRect();
      bounds.left = rect.left;
      bounds.top = rect.top;
    };

    const onViewportShift = () => {
      // iOS fires this as the URL bar hides. Updating bounds here rotates
      // the drag origin under the finger and the ring jumps a slot.
      if (pressing || dragging) return;
      syncBounds();
    };

    resize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onViewportShift);
    window.visualViewport?.addEventListener("scroll", onViewportShift);
    coarseMQ.addEventListener?.("change", onResize);

    /* ------------------------------------------------------- spin & input */
    const ringCentre = { x: 0, y: 0 };
    // Which way "front" is: from the ring's centre toward the middle of the
    // screen. Once the ring is off centre that is no longer 3 o'clock.
    let frontAngle = 0;
    let interactive = false;
    let spinVel = 0; // rad/s
    let dragPrevAngle = 0;
    let dragPrevTime = 0;
    let tapLimit = 6;
    let tapConsumed = false;
    let pressX = 0;
    let pressY = 0;

    // The snap is a phase, not a force that is always on: a flick coasts
    // untouched, and once it is nearly spent the ring commits to a slot and
    // runs itself in. snapTo is that slot, snapCap the speed it came in at.
    let settling = false;
    let snapTo = 0;
    let snapCap = 0;
    // Cheap-spin amount, chased. A boolean made goo/glass/honey pop on phone.
    let cheapOn = false;
    let cheapAmt = 0;

    // A click is turning the ring to a card. While this is up the momentum
    // above is suspended entirely, so the two cannot both drive spin.
    let picking = false;
    let activePick = null;
    let pendingOpen = null;
    let openGen = 0;

    let pointerTravel = 0; // tells a click from a drag
    let travelX = 0;
    let travelY = 0;

    const pointerAngle = (e) => {
      const dx = e.clientX - bounds.left - ringCentre.x;
      const dy = e.clientY - bounds.top - ringCentre.y;
      return Math.atan2(-dy, dx);
    };

    const cancelPendingOpen = () => {
      pendingOpen = null;
    };

    const stopPick = () => {
      cancelPendingOpen();
      if (!picking) return;
      gsap.killTweensOf(state);
      activePick = null;
      picking = false;
    };

    // Turn the ring until plane i faces front. A tween rather than a target
    // handed to the snap: the snap is a run-in for a throw that is nearly
    // spent and is shaped so it can only slow down, but a pick starts from a
    // standstill and has to accelerate.
    const pick = (i, onOpen) => {
      // A new pick supersedes any old tween and its route callback.
      stopPick();

      const slot = TAU / Math.round(params.count);
      // Spread, plane i sits at seed + signedOffset(i) * slot + spin.
      const base = frontAngle - params.seed * DEG - signedOffset(i) * slot;
      // Nearest equivalent winding, so it takes the short way round rather
      // than unwinding whole turns. Every card is within half a ring.
      const target = base + Math.round((state.spin - base) / TAU) * TAU;

      const slots = Math.abs(target - state.spin) / slot;
      // Already there. Opening the project belongs here eventually.
      if (slots < 0.01) {
        if (!disposed) onOpen?.();
        return;
      }

      spinVel = 0;
      settling = false;
      picking = true;
      const run = {};
      activePick = run;
      pendingOpen = run;
      gsap.killTweensOf(state);
      gsap.to(state, {
        spin: target,
        // Root of the distance, not linear: a card eight slots round should
        // take longer than its neighbour but not eight times longer.
        duration: params.pickTime * Math.sqrt(Math.max(1, slots)),
        ease: params.pickEase,
        onComplete: () => {
          if (activePick !== run) return;
          activePick = null;
          picking = false;
          const shouldOpen = pendingOpen === run;
          pendingOpen = null;
          if (shouldOpen && !disposed) onOpen?.();
        },
      });
    };

    const planeForProject = (projectIndex) => {
      const count = Math.round(params.count);
      for (let i = 0; i < count; i++) {
        if (cellOf(signedOffset(i)) === projectIndex) return i;
      }
      return -1;
    };

    pickProjectRef.current = (projectIndex) => {
      if (!interactive) return;
      const plane = planeForProject(projectIndex);
      if (plane < 0) return;
      const open = openForPlane(plane);
      pick(plane, open);
    };

    /* ------------------------------------------------------------ pointer */
    // World px, origin at screen centre, Y up — the space the shader works in,
    // so nothing is converted twice.
    //
    // `inside` means the position is worth reading, which is what the card hit
    // test needs. Whether the softening is *on* is a separate question,
    // because on touch it is not simply "is there a pointer".
    const pointer = { x: 0, y: 0, inside: false, seeded: false };
    // What the ring actually follows: the cursor, smoothed. How far this
    // trails the real pointer stands in for speed and drives the wake.
    const cursor = { x: 0, y: 0, amt: 0, wake: 0 };

    // Read off the events rather than a media query, so a laptop with a
    // touchscreen behaves as whichever is being used at the time.
    let coarse = false;
    let held = false;
    let holdTimer = 0;

    const endHold = () => {
      clearTimeout(holdTimer);
      holdTimer = 0;
      held = false;
    };

    const beginHold = () => {
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        held = true;
      }, params.touchHold * 1000);
    };

    // Mouse: being over it is the whole gesture. Touch: only a press held
    // still long enough to mean it.
    const engaged = () => (coarse ? held : pointer.inside);

    const trackPointer = (e) => {
      coarse = e.pointerType === "touch";
      pointer.x = e.clientX - bounds.left - viewW * 0.5;
      pointer.y = viewH * 0.5 - (e.clientY - bounds.top);
      pointer.inside = true;
      // Otherwise the first move sweeps the softening across the ring from
      // wherever the cursor was last left.
      if (!pointer.seeded) {
        pointer.seeded = true;
        cursor.x = pointer.x;
        cursor.y = pointer.y;
      }
    };

    const onPointerLeave = () => {
      // Capture release on touch synthesises a leave even though the press is
      // still being handled. Swallow that or the tap test thinks the finger left.
      if (pressing) return;
      pointer.inside = false;
    };

    // iOS will otherwise treat the swipe as document pan, fire pointercancel,
    // and the ring both hitch-scrolls and never sees the tap that should open.
    const lockTouchScroll = (e) => {
      if (e.cancelable) e.preventDefault();
    };

    // Leftover wheel px toward the next card. Cleared when the ring parks so
    // a half-gesture cannot fire the moment you breathe on the pad.
    let wheelCarry = 0;

    const onWheel = (e) => {
      if (!interactive) return;
      e.preventDefault();
      // Trackpads send horizontal deltas too; take whichever dominates.
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // Firefox still reports lines; one line is one notch, not one pixel.
      if (e.deltaMode === 1) d *= 16;
      if (e.deltaMode === 2) d *= 800;
      // Fresh input hands the ring back to its own momentum.
      stopPick();
      settling = false;

      const count = Math.max(1, Math.round(params.count));
      const slot = TAU / count;
      const refSlot = TAU / Math.max(1, params.ringRefCount);
      // Same px used to walk one card at 18; fewer projects have a wider step.
      spinVel += d * params.scrollSpeed * (slot / refSlot);

      wheelCarry += d;
      const stepPx = Math.max(8, params.scrollStep);
      if (Math.abs(wheelCarry) >= stepPx) {
        const sign = Math.sign(wheelCarry);
        wheelCarry = 0;
        const decay = Math.max(0.01, -Math.log(params.damping) * 60);
        const minKick = decay * slot * Math.max(0.51, params.scrollSlot);
        if (sign * spinVel < minKick) spinVel = sign * minKick;
      }

      spinVel = Math.max(-params.maxSpeed, Math.min(params.maxSpeed, spinVel));
    };

    const onPointerDown = (e) => {
      if (e.cancelable && e.pointerType === "touch") e.preventDefault();
      syncBounds();
      coarse = e.pointerType === "touch";
      pointerTravel = 0;
      tapConsumed = false;
      travelX = e.clientX;
      travelY = e.clientY;
      tapLimit = coarse ? params.tapSlop : 6;
      trackPointer(e);
      pressX = pointer.x;
      pressY = pointer.y;
      pressing = true;
      dragging = false;
      if (!interactive) return;
      if (coarse) beginHold();
      dragPrevAngle = pointerAngle(e);
      dragPrevTime = performance.now();
      canvas.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (e.cancelable && (pressing || e.pointerType === "touch")) {
        e.preventDefault();
      }
      trackPointer(e);

      // From coordinates, not movementX/Y: those are zero for touch in Safari,
      // which would make every swipe look stationary and end in a tap.
      pointerTravel +=
        Math.abs(e.clientX - travelX) + Math.abs(e.clientY - travelY);
      travelX = e.clientX;
      travelY = e.clientY;
      // Only before the hold takes. After that, moving drags the ring and the
      // melt together, same as a drag with the cursor down.
      if (coarse && !held && pointerTravel > params.touchSlop) endHold();

      if (!pressing) return;

      if (!dragging && pointerTravel > tapLimit) {
        dragging = true;
        if (interactive) {
          stopPick();
          settling = false;
          spinVel = 0;
          dragPrevAngle = pointerAngle(e);
          dragPrevTime = performance.now();
        }
      }

      if (!dragging || !interactive) return;

      const a = pointerAngle(e);
      let delta = a - dragPrevAngle;
      // Short way round, so crossing the +/-pi seam does not snap.
      if (delta > Math.PI) delta -= TAU;
      if (delta < -Math.PI) delta += TAU;

      const turn =
        delta * params.dragSpeed * (coarse ? params.dragSpeedTouch : 1);
      state.spin += turn;

      const now = performance.now();
      // A finger-up on iOS often sends a last move with no delta, which would
      // zero the flick and make the ring feel like it had been grabbed.
      if (Math.abs(turn) > 1e-6) {
        spinVel = turn / (Math.max(8, now - dragPrevTime) / 1000);
        dragPrevTime = now;
      }
      dragPrevAngle = a;
    };

    const tryOpenPlane = (x, y) => {
      if (!interactive) return;
      const pad = coarse ? Math.max(16, tapLimit) : 0;
      let plane = planeAt(x, y, pad);
      if (plane < 0) {
        const count = Math.round(params.count);
        const W = uniforms.uSize.value.x;
        const H = uniforms.uSize.value.y;
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < count; i++) {
          const scale = uniforms.uScale.value[i];
          const pos = uniforms.uPos.value[i];
          const dx = x - pos.x;
          const dy = y - pos.y;
          const d = dx * dx + dy * dy;
          const reach = Math.hypot(W * scale.x, H * scale.y) * 0.5 + pad;
          if (d < reach * reach && d < bestD) {
            bestD = d;
            best = i;
          }
        }
        plane = best;
      }
      if (plane < 0) return;
      const open = openForPlane(plane);
      if (open) pick(plane, open);
    };

    const onPointerUp = (e) => {
      // Releasing the capture fires a leave at the container even though the
      // cursor never went anywhere, so re-track before anything else.
      trackPointer(e);
      const wasPress = pressing;
      const wasDrag = dragging;
      pressing = false;
      dragging = false;
      endHold();
      canvas.releasePointerCapture?.(e.pointerId);
      if (!wasPress || wasDrag) return;
      if (pointerTravel > tapLimit) return;
      tapConsumed = true;
      tryOpenPlane(pressX, pressY);
    };

    const onPointerCancel = (e) => {
      pressing = false;
      dragging = false;
      endHold();
      canvas.releasePointerCapture?.(e.pointerId);
    };

    // A drag ends in a click too, so only a near-stationary press counts.
    // `over` comes from the same hit test that decides the tag, so a click
    // only ever lands on the card the tag was offering.
    const openForPlane = (plane) => {
      if (imageCount <= 0) return null;
      const project = ring[cellOf(signedOffset(plane))];
      if (!project?.slug) return null;
      return async () => {
        if (disposed || !activeRef.current) return;
        const gen = ++openGen;

        const imageSrc = projectImageSrc(project);
        const from = rectForPlane(plane);
        const push = () => routerRef.current.push(`/work/${project.slug}`);
        const start = startTransitionRef.current;

        if (!start) {
          push();
          return;
        }

        const animated = await start({
          slug: project.slug,
          src: imageSrc,
          from,
        });

        if (disposed || gen !== openGen || !activeRef.current) return;

        if (!animated) {
          push();
          return;
        }

        // Hide the WebGL card immediately once the flyer covers it. A fade
        // here leaves a frame where neither layer is visible.
        gsap.set(renderer.domElement, { opacity: 0 });

        document.documentElement.dataset.sharedTransition = "navigating";
        push();
      };
    };

    const onClick = () => {
      if (tapConsumed) {
        tapConsumed = false;
        return;
      }
      if (!interactive || pointerTravel > tapLimit || !pointer.inside) return;
      tryOpenPlane(pointer.x, pointer.y);
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchmove", lockTouchScroll, { passive: false });

    const updatePointer = (dt) => {
      // Held off until the entry finishes, so the cursor cannot soften the
      // ring while the timeline is still drawing it.
      const live = params.hover && engaged() && pointer.seeded && interactive;
      cursor.amt += ((live ? 1 : 0) - cursor.amt) * chase(dt, 0.12);

      const k = chase(dt, params.lag);
      cursor.x += (pointer.x - cursor.x) * k;
      cursor.y += (pointer.y - cursor.y) * k;

      // The gap left behind the real pointer stands in for speed. Instant
      // attack, slow release, so the wake outlives the movement.
      const trail = Math.hypot(pointer.x - cursor.x, pointer.y - cursor.y);
      cursor.wake = Math.max(
        cursor.wake * Math.pow(0.94, dt * 60),
        clamp01(trail / (Math.max(dt, 0.001) * 2600)),
      );

      // Scaled by fit like the ring: a reach in raw px would cross two cards
      // on a small window and half of one on a large. Frequencies are not.
      uniforms.uMouse.value.set(
        cursor.x,
        cursor.y,
        cursor.amt,
        params.melt * fit,
      );
      uniforms.uMelt.value.set(
        params.meltReach * fit,
        params.wave * fit * cursor.wake * cursor.amt,
        params.waveFreq,
        params.waveSpeed,
      );
    };

    /* ------------------------------------------------------- load counter */
    // Reads whichever of the two is further behind: the art arriving, or the
    // seed's own birth. Both have to finish before there is anything to
    // launch, so counting bytes alone leaves the number sitting on 100 waiting
    // for a condition nobody told the viewer about.
    const loading = { shown: 0 };
    const chargeAt = performance.now();
    const loaderCountEl = loaderEl?.querySelector("[data-loader-count]");
    const loaderTimeEl = loaderEl?.querySelector("[data-loader-time]");

    const tickLoader = (dt) => {
      const target = Math.min(loadProg, clamp01(state.progress));
      loading.shown += (target - loading.shown) * chase(dt, params.loaderChase);

      // Never 000; that reads as nothing happening.
      const n = Math.min(100, Math.max(1, Math.round(loading.shown * 100)));
      const total = Math.max(
        0,
        Math.floor((performance.now() - chargeAt) / 1000),
      );
      const clock = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
      if (loaderCountEl) loaderCountEl.textContent = String(n).padStart(3, "0");
      if (loaderTimeEl) loaderTimeEl.textContent = clock;
      if (loaderEl) {
        loaderEl.setAttribute(
          "aria-label",
          `Charging ${String(n).padStart(3, "0")} percent, ${clock}`,
        );
      }

      if (!launchReady && n >= 100) {
        launchReady = true;
        for (const fn of readyWaiters) fn();
        readyWaiters.length = 0;
      }
    };

    /* ------------------------------------------------------- the carousel */
    const travel = new Float32Array(MAX_PLANES);
    const cum = new Float32Array(MAX_PLANES);
    const order = [];
    // Where each plane would sit with no cursor near it. The honey is measured
    // off these, so hovering cannot feed back into the unfurl's geometry.
    const rest = Array.from({ length: MAX_PLANES }, () => new THREE.Vector2());

    // Per-plane response to the pointer, eased rather than recomputed from
    // where it is, so the ring trails the cursor and settles back on its own.
    const hoverF = new Float32Array(MAX_PLANES);
    const leanX = new Float32Array(MAX_PLANES);
    const leanY = new Float32Array(MAX_PLANES);
    const webF = new Float32Array(MAX_LINKS);
    // The other half of it: how much a plane is standing aside for the card
    // being pointed at. Zero on that card, zero when there isn't one.
    const sideF = new Float32Array(MAX_PLANES);
    // Where the hovered card is, latched at the end of a frame for the next
    // one. The hit test runs inside the loop and every plane needs an answer
    // before the loop reaches that card, so this is deliberately one frame
    // behind — it is eased over ten of them anyway. Not reset when the cursor
    // leaves: the direction has to stay meaningful while the push decays.
    const focusPos = new THREE.Vector2();

    const swellOf = (i) =>
      Math.max(
        0.05,
        1 + params.swell * hoverF[i] - params.sideScale * sideF[i],
      );

    // Which card is at the front, and which is under the cursor.
    let shown = -1;
    let announced = -1;
    let over = -1;
    let tagUp = false;

    const paintList = () => {
      const items = itemsRef.current;
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (!el) continue;
        const on = i === shown;
        el.style.opacity = on ? "1" : "0.2";
        if (on) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
      }
    };

    // The animation cursor intentionally lags the pointer, but a click must
    // use the coordinates from the press itself rather than the last frame's
    // hover result.
    const planeAt = (x, y, pad = 0) => {
      const count = Math.round(params.count);
      const W = uniforms.uSize.value.x;
      const H = uniforms.uSize.value.y;

      for (let i = 0; i < count; i++) {
        const scale = uniforms.uScale.value[i];
        const pos = uniforms.uPos.value[i];
        const rot = uniforms.uRot.value[i];
        const qx = x - pos.x;
        const qy = y - pos.y;
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);

        if (
          Math.abs(qx * cr + qy * sr) <= W * 0.5 * scale.x + pad &&
          Math.abs(-qx * sr + qy * cr) <= H * 0.5 * scale.y + pad
        ) {
          return i;
        }
      }

      return -1;
    };

    // Screen-space bounds of a plane, for the shared-element handoff to the
    // project hero. Same box the shader draws and planeAt tests against.
    const rectForPlane = (i) => {
      const scale = uniforms.uScale.value[i];
      const pos = uniforms.uPos.value[i];
      const rot = uniforms.uRot.value[i];
      const W = uniforms.uSize.value.x;
      const H = uniforms.uSize.value.y;
      const hw = W * scale.x * 0.5;
      const hh = H * scale.y * 0.5;
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const bounds = container.getBoundingClientRect();
      const ox = bounds.left + bounds.width * 0.5;
      const oy = bounds.top + bounds.height * 0.5;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const [lx, ly] of [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
      ]) {
        const wx = pos.x + lx * cr - ly * sr;
        const wy = pos.y + lx * sr + ly * cr;
        const sx = ox + wx;
        const sy = oy - wy;
        minX = Math.min(minX, sx);
        minY = Math.min(minY, sy);
        maxX = Math.max(maxX, sx);
        maxY = Math.max(maxY, sy);
      }

      return {
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY,
        borderRadius: uniforms.uRadius.value,
      };
    };

    const layout = (dt) => {
      const count = Math.round(params.count);
      uniforms.uCount.value = count;

      const step = TAU / count;
      const spread = clamp01(state.spread);

      // Band values are picked per frame rather than latched on resize, so
      // dragging any of these sliders shows up straight away.
      const endScale = tightNow
        ? params.tightEndScale
        : narrowNow
          ? params.narrowEndScale
          : params.endScale;
      const posX = tightNow
        ? params.tightPosX
        : narrowNow
          ? params.narrowPosX
          : params.posX;

      // The stage transform. Everything in plane-pixels goes through g, which
      // is why the window fit rides in here rather than on a dozen params.
      const shift = clamp01(state.shift);
      const g = (1 + (endScale - 1) * shift) * fit;
      const cy = params.posY * viewH * 0.5 * shift;

      // Spacing is authored at ringRefCount; grow/shrink the circle with the
      // live set so cards keep their size and their gap.
      const ringR = radiusForCount(
        params.ringRadius,
        params.ringRefCount,
        count,
      );

      // Landed geometry, so the entry can still travel from centre and the
      // clamp does not fight the timeline. minScale can pin the ring larger
      // than this window; without this the facing card walks off an edge.
      const gLand = endScale * fit;
      const Rland = ringR * radiusK * gLand;
      const Wland = params.planeSize * planeK * gLand;
      const hubX = posX * viewW * 0.5;
      // posX was authored against ringRefCount. Keep the facing card where
      // that composition put it (near centre) and only move the hub, so a
      // smaller set cannot slide the open card into the left edge.
      const frontTarget = params.ringRadius * radiusK * gLand + hubX;
      let stageX = frontTarget - Rland;
      const frontX = Rland + stageX;
      const pad = params.edgePad;
      const maxX = viewW * 0.5 - Wland * 0.5 - pad;
      if (maxX <= 0) {
        stageX = -Rland;
      } else if (frontX > maxX) {
        stageX -= frontX - maxX;
      } else if (frontX < -maxX) {
        stageX += -maxX - frontX;
      }
      const cx = stageX * shift;

      // Screen-space centre, for pointer maths. World Y is up, page Y is down.
      ringCentre.x = viewW * 0.5 + cx;
      ringCentre.y = viewH * 0.5 - cy;
      // A plane faces front when the ring centre, that plane and the middle of
      // the screen line up. Before the stage move there is no front, so 3
      // o'clock stands in.
      frontAngle = cx !== 0 || cy !== 0 ? Math.atan2(-cy, -cx) : 0;

      // Anything measured in plane long edges — hover reach, thread reach,
      // side falloff — comes off W, so the narrow bump reaches them for free.
      const W = params.planeSize * planeK * g;
      const H = W / 1.5;
      uniforms.uSize.value.set(W, H);
      // Tracks the plane, not the window: a card 25% bigger with the same
      // corner is a differently shaped card, not a bigger one.
      uniforms.uRadius.value = params.radius * planeK * g;

      // Radial: the long edge points outward, so a plane's reach toward its
      // neighbour is its short axis and the facing edges are the long ones.
      const sepExtent = params.radial ? H : W;
      const faceEdge = params.radial ? W : H;

      const R = ringR * radiusK * g;
      const restingGap = 2 * R * Math.sin(step / 2) - sepExtent;
      info.restingGap = Math.round((restingGap / g) * 10) / 10;
      // The whole stretch plays out across this, so it is the yardstick.
      const finalSep = Math.max(1, restingGap);

      // Every generation is in flight at once, offset by a small phase, so
      // this is one continuous unfurl and not a queue of separate pops.
      const maxN = Math.max(1, Math.abs(signedOffset(count - 1)));
      const dur = Math.max(0.1, 1 - FAN_START - params.stagger);

      // Cumulative, so an unborn plane sits exactly on top of its parent and
      // is peeled out of it one ring step at a time.
      cum[0] = 0;
      for (let n = 1; n <= maxN; n++) {
        const start = FAN_START + ((n - 1) / maxN) * params.stagger;
        const t = clamp01((spread - start) / dur);
        const e = t * t * (3 - 2 * t);
        travel[n] = e;
        cum[n] = cum[n - 1] + e;
      }

      const seedAngle = params.seed * DEG;
      // The seed is born flat at centre then rides out. Applied as the radius
      // rather than an offset on plane 0, so scrubbing the timeline stays
      // consistent — the unborn are stacked on the seed either way.
      const launch = easeInOutCubic(clamp01(state.launch));
      const Rnow = R * launch;

      order.length = 0;

      const track = cursor.amt > 0.001;
      const reach = Math.max(1, params.reach * W);
      const sideReach = Math.max(1, params.sideReach * W);
      // Asymmetric on purpose: the ring takes up a lean quickly and lets go
      // slowly. Equal rates read as a mechanism following the cursor; the gap
      // between them is what reads as something viscous.
      const kRise = chase(dt, params.grab);
      const kFall = chase(dt, params.release);

      // Nearest plane to front, in angle rather than screen distance: two
      // planes can sit equally far from the middle, but only one faces it.
      let frontI = -1;
      let frontD = 1e9;
      let frontCell = 0;

      // Which card the cursor is on. Independent of the hover falloff above:
      // turning the goo off should not take the tag with it.
      const probe = pointer.inside && pointer.seeded && interactive;
      let overI = -1;
      // Which card the rest are standing aside for, from last frame.
      const focusI = track ? over : -1;

      for (let i = 0; i < count; i++) {
        const sIdx = signedOffset(i);
        const n = Math.abs(sIdx);
        const u = i === 0 ? clamp01(state.progress) : travel[n];
        const cell = cellOf(sIdx);

        const angle = seedAngle + Math.sign(sIdx) * step * cum[n] + state.spin;
        const px = Math.cos(angle) * Rnow + cx;
        const py = Math.sin(angle) * Rnow + cy;
        rest[i].set(px, py);

        // atan2 of the difference wraps to +/-pi, so the seam costs nothing.
        const da = angle - frontAngle;
        const toFront = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        if (toFront < frontD) {
          frontD = toFront;
          frontI = i;
          frontCell = cell;
        }

        // Lean toward the cursor. Scaled by u so the unborn keep out of it:
        // they are stacked on their parent, and without this the whole stack
        // would lean at once and drag the seed off the ring.
        let f = 0;
        let toX = 0;
        let toY = 0;
        if (track) {
          const dx = cursor.x - px;
          const dy = cursor.y - py;
          const dist = Math.hypot(dx, dy);
          f = smoothstep(reach, reach * 0.22, dist) * cursor.amt * u;
          if (f > 0.0001 && dist > 0.0001) {
            const lean = (params.pull * fit * f) / dist;
            toX = dx * lean;
            toY = dy * lean;
          }
        }

        // One rate for the whole of a plane's response, so the swell, the lean
        // and the honey it feeds move together instead of drifting apart.
        const k = f > hoverF[i] ? kRise : kFall;
        hoverF[i] += (f - hoverF[i]) * k;
        leanX[i] += (toX - leanX[i]) * k;
        leanY[i] += (toY - leanY[i]) * k;

        // Standing aside. Measured from the hovered card, not the cursor, so
        // the response holds steady while the cursor moves around inside it.
        let sf = 0;
        if (focusI >= 0 && i !== focusI) {
          const d = Math.hypot(focusPos.x - px, focusPos.y - py);
          sf = smoothstep(sideReach, sideReach * 0.2, d) * u;
        }
        // Its own rate: a card can be letting go of a lean at the same moment
        // it is asked to back away, and sharing one would make the second
        // thing sluggish.
        sideF[i] += (sf - sideF[i]) * (sf > sideF[i] ? kRise : kFall);

        // Straight off the eased factor — sideF is already smooth, and easing
        // it twice would only add lag.
        let pushX = 0;
        let pushY = 0;
        if (sideF[i] > 0.0001) {
          const dx = px - focusPos.x;
          const dy = py - focusPos.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.0001) {
            const away = (params.sidePush * fit * sideF[i]) / dist;
            pushX = dx * away;
            pushY = dy * away;
          }
        }

        uniforms.uPos.value[i].set(
          px + leanX[i] + pushX,
          py + leanY[i] + pushY,
        );
        uniforms.uRot.value[i] =
          (params.radial ? angle : angle + HALF_PI) * launch;

        // The seed grows over its whole birth. The others are already there,
        // merged inside their parent, so they reach full size early and spend
        // the rest of their travel pulling away.
        const sx =
          i === 0
            ? easeOutCubic(clamp01(u / 0.7))
            : easeOutCubic(clamp01(u / 0.34));
        const sy =
          i === 0
            ? easeOutCubic(clamp01((u - 0.18) / 0.74))
            : easeOutCubic(clamp01((u - 0.06) / 0.36));
        // The swell rides on the birth scale rather than uSize, so a plane
        // under the cursor grows about its own centre.
        const sw = swellOf(i);
        uniforms.uScale.value[i].set(
          sx * sw,
          sy * sw,
          1 - params.sideDim * sideF[i],
          cell,
        );

        // Same box the shader draws, tested in the plane's own frame, so it
        // answers for the card as it actually is: turned, leaned and swollen.
        // Cards never overlap once formed, so the first hit is the only hit.
        if (probe && overI < 0) {
          const rot = uniforms.uRot.value[i];
          const qx = cursor.x - (px + leanX[i] + pushX);
          const qy = cursor.y - (py + leanY[i] + pushY);
          const cr = Math.cos(rot);
          const sr = Math.sin(rot);
          if (
            Math.abs(qx * cr + qy * sr) <= W * 0.5 * sx * sw &&
            Math.abs(-qx * sr + qy * cr) <= H * 0.5 * sy * sw
          ) {
            overI = i;
          }
        }

        order.push(i);
      }

      for (let i = count; i < MAX_PLANES; i++) {
        uniforms.uScale.value[i].set(0, 0, 1, 0);
        hoverF[i] = 0;
        leanX[i] = 0;
        leanY[i] = 0;
        sideF[i] = 0;
      }

      over = overI;
      // Both tests, not either: the width covers a small window on a mouse,
      // `coarse` covers a large tablet. Re-tested every frame so a window
      // dragged across the threshold resolves instead of stranding the tag.
      const wantTag = over >= 0 && !coarse && viewW > params.tagFrom;
      if (wantTag !== tagUp) {
        tagUp = wantTag;
        tag.show(wantTag);
      }
      // Off the resting centre, so a card being pushed cannot chase its own
      // shadow next frame.
      if (over >= 0) focusPos.copy(rest[over]);

      // Carried every frame whether present or not, so the tag is already in
      // the right place the moment it is asked to appear.
      uniforms.uTag.value.set(
        cursor.x + params.tagX,
        cursor.y + params.tagY,
        tag.box.sx,
        tag.box.sy,
      );
      uniforms.uTagP.value.set(
        TAG_W * 0.5,
        TAG_H * 0.5,
        TAG_H * 0.5,
        params.tagRefract,
      );
      uniforms.uTagQ.value.set(params.tagFrost, params.tagRim, 0, 0);

      // The column and the meta name whatever cell the front plane is wearing,
      // read off the same deal the shader was handed rather than recomputed —
      // so the highlight cannot disagree with the art.
      if (frontI >= 0 && imageCount > 0 && frontCell !== shown) {
        shown = frontCell;
        paintList();
      }

      /* ---- honey ---- */
      // One bridge per parent/child pair, in ring order. Deliberately none
      // closing the circle while the fan is opening: those two planes were
      // never merged, so there is nothing between them to stretch.
      //
      // Goo, threads and the glass lip smear the ring into a blur while it
      // turns. Drop them for the throw and ease them back — a boolean swap
      // is the flash on every phone flick.
      const wantCheap =
        dragging || picking || settling || Math.abs(spinVel) > params.cheapIn;
      if (wantCheap) cheapOn = true;
      else if (
        !dragging &&
        !picking &&
        !settling &&
        Math.abs(spinVel) < params.cheapOut
      ) {
        cheapOn = false;
      }
      cheapAmt += ((cheapOn ? 1 : 0) - cheapAmt) * chase(dt, params.cheapChase);
      if (cheapAmt < 0.001) cheapAmt = 0;
      if (cheapAmt > 0.999) cheapAmt = 1;
      const linkFade = 1 - cheapAmt;

      order.sort((a, b) => signedOffset(a) - signedOffset(b));

      const edgeHalf = faceEdge * 0.5 * params.thread;
      // Once closed the seam pair are neighbours like any other, and without a
      // link the one gap the fan never opened is the only one the cursor
      // cannot web back together.
      const closed = spread > 0.995 && count > 2;
      const linkCount =
        linkFade < 0.04 ? 0 : Math.min(closed ? count : count - 1, MAX_LINKS);

      for (let l = 0; l < linkCount; l++) {
        const ia = order[l];
        const ib = order[(l + 1) % count];

        const ca = uniforms.uPos.value[ia];
        const cb = uniforms.uPos.value[ib];
        const scA = uniforms.uScale.value[ia];
        const scB = uniforms.uScale.value[ib];

        // Measured between resting centres and birth scales, never hovered
        // ones. The unfurl's response to separation is ferociously steep — a
        // couple of percent of the gap is already a slab — so letting the lean
        // and the swell in turns a hover into a puzzle-piece join.
        const shrinkA = (params.radial ? scA.y : scA.x) / swellOf(ia);
        const shrinkB = (params.radial ? scB.y : scB.x) / swellOf(ib);
        const sep =
          rest[ia].distanceTo(rest[ib]) - sepExtent * 0.5 * (shrinkA + shrinkB);

        // 0 = faces still touching, 1 = landed at the resting gap.
        const v = clamp01(sep / finalSep);

        // Hover strings its own thread on its own curve, so it can be dialled
        // to a filament rather than inheriting the unfurl's slab. Taken at the
        // gap's midpoint, so the strongest pull lands between two planes.
        let fl = 0;
        if (track && params.web > 0.0001) {
          const mx = (ca.x + cb.x) * 0.5;
          const my = (ca.y + cb.y) * 0.5;
          const webReach = Math.max(1, params.webReach * W);
          const d = Math.hypot(cursor.x - mx, cursor.y - my);
          fl = smoothstep(webReach, webReach * 0.15, d) * cursor.amt;
        }
        // Eased on the same rates as the planes it hangs between, or the
        // thread would be there before the pull was.
        webF[l] += (fl - webF[l]) * (fl > webF[l] ? kRise : kFall);

        const w = Math.max(Math.pow(1 - v, params.thin), params.web * webF[l]);
        // dissolve carries the radius past zero and out of antialiasing range
        // so the thread fades instead of bottoming out as a half-covered
        // hairline. In screen px, so unlike edgeHalf it does not carry g.
        const rEnd = edgeHalf * w - params.dissolve;
        const rMid = rEnd * (1 - (1 - params.pinch) * smoothstep(0, 0.7, v));

        uniforms.uLinkA.value[l].copy(ca);
        uniforms.uLinkB.value[l].copy(cb);
        uniforms.uLinkPar.value[l].set(
          rEnd * linkFade,
          rMid * linkFade,
          params.sag * g * Math.pow(v, 1.5),
          // Per link, not global: with staggered generations these are all at
          // different stages. Never wider than the neck it rounds.
          Math.min(
            params.fillet * g * smoothstep(0, 0.35, v),
            Math.max(rMid, 0) * 1.5,
          ) * linkFade,
        );
      }
      for (let l = linkCount; l < MAX_LINKS; l++) {
        uniforms.uLinkPar.value[l].set(-100, -100, 0, 0);
      }
      uniforms.uLinkCount.value = linkCount;

      // Both are px into the distance field, so they scale with the ring or
      // the merge reads as a different material at a different window size.
      uniforms.uK.value = params.goo * planeK * fit * (1 - cheapAmt * 0.88);
      uniforms.uWobble.value =
        params.wobble * fit * (1 - smoothstep(0.2, 0.95, state.progress));

      // Gated on the seed's own cell, not on the atlas existing: the texture
      // is bound from frame one but blank, and texturing before anything is
      // painted into it draws an empty cell.
      uniforms.uTextured.value = params.textured && firstIn ? 1 : 0;
      uniforms.uBlend.value = Math.max(
        0.5,
        params.blend * planeK * g * (1 - cheapAmt * 0.78),
      );

      // The glass lip popping on and off is the hitch on a phone. Leave it
      // off in lo-fi; elsewhere fade it with the throw instead of slamming.
      const glassK = params.glass && !loFi ? 1 - cheapAmt : 0;
      uniforms.uBandTop.value = glassK * params.bandTop * viewH;
      uniforms.uBandBottom.value = glassK * params.bandBottom * viewH;
      uniforms.uGlass.value.set(
        params.refract,
        params.squeeze,
        params.ripple,
        params.rippleFreq,
      );
      uniforms.uFringe.value = glassK * params.fringe;
      uniforms.uSheen.value = glassK * params.sheen;

      const fieldPad = uniforms.uK.value + uniforms.uWobble.value + 20;
      let fieldMinX = Infinity;
      let fieldMinY = Infinity;
      let fieldMaxX = -Infinity;
      let fieldMaxY = -Infinity;
      for (let i = 0; i < count; i++) {
        const sc = uniforms.uScale.value[i];
        if (Math.max(sc.x, sc.y) < 0.0001) continue;
        const pos = uniforms.uPos.value[i];
        const hx = W * sc.x * 0.5 + fieldPad;
        const hy = H * sc.y * 0.5 + fieldPad;
        if (pos.x - hx < fieldMinX) fieldMinX = pos.x - hx;
        if (pos.y - hy < fieldMinY) fieldMinY = pos.y - hy;
        if (pos.x + hx > fieldMaxX) fieldMaxX = pos.x + hx;
        if (pos.y + hy > fieldMaxY) fieldMaxY = pos.y + hy;
      }
      if (fieldMinX === Infinity) {
        uniforms.uBound.value.set(0, 0, 0, 0);
      } else {
        uniforms.uBound.value.set(fieldMinX, fieldMinY, fieldMaxX, fieldMaxY);
      }
    };

    /* ------------------------------------------------------- entry timeline */
    // Bumped per build, so a hold left waiting on a run that has since been
    // replaced cannot resume a timeline nobody is watching.
    let entryGen = 0;

    const build = () => {
      interactive = false;
      announced = -1;
      spinVel = 0;
      dragging = false;
      settling = false;
      textGroup.visible = true;
      // The timeline tweens state.spin, so a pick in flight has to be off the
      // same property before it starts.
      stopPick();

      const gen = ++entryGen;
      // Only the first run has anything to wait for; a replay should not flash
      // the counter back up.
      if (loaderEl) gsap.set(loaderEl, { opacity: launchReady ? 0 : 1 });

      const tl = gsap.timeline({
        delay: 0.25,
        onComplete: () => {
          interactive = true;
          if (!activeRef.current) renderer.setAnimationLoop(null);
        },
      });

      tl.fromTo(
        state,
        { progress: 0, launch: 0, spread: 0, spin: 0, shift: 0 },
        { progress: 1, duration: 1.2, ease: "power2.out" },
      );

      // Formed and sitting at centre. It stays there until the counter lands,
      // so the ring can never unfurl into cards with nothing on them. Usually
      // there is nothing left to wait for by the time the playhead arrives —
      // the counter is paced against this same birth.
      tl.addPause(">", () => {
        whenReady(() => {
          gsap.delayedCall(params.holdAfter, () => {
            if (disposed || gen !== entryGen) return;
            tl.resume();
            if (loaderEl) {
              gsap.to(loaderEl, {
                opacity: 0,
                duration: params.loaderOut,
                ease: "power2.in",
              });
            }
          });
        });
      });

      tl.to(state, {
        launch: 1,
        duration: params.launchTime,
        ease: "power2.inOut",
      });

      // Absolute positions from here, so the stage can be dropped anywhere
      // inside the spread rather than only after it.
      const spreadStart = tl.duration() - 0.15;
      tl.to(
        state,
        { spread: 1, duration: params.spreadTime, ease: params.spreadEase },
        spreadStart,
      );

      const stageStart = spreadStart + params.stageAt * params.spreadTime;
      tl.to(
        state,
        {
          spin: params.spinTurns * TAU,
          duration: params.spinTime,
          ease: params.spinEase,
        },
        stageStart + params.spinDelay,
      );
      tl.to(
        state,
        { shift: 1, duration: params.moveTime, ease: params.moveEase },
        stageStart + params.moveDelay,
      );

      const textStart = spreadStart + params.textAt * params.spreadTime;

      if (splitText.chars.length) {
        tl.fromTo(
          splitText.chars,
          { value: 0 },
          {
            value: 1,
            duration: params.textTime,
            ease: params.textEase,
            stagger: params.textStagger,
          },
          textStart,
        );
      }

      // The heading has done its job by the time the ring is in place, and
      // from then on it is behind the front card. Timed off whichever staging
      // move finishes last, so it still lands with them if either is retimed.
      if (params.textOut && splitText.fades.length) {
        const landed = Math.max(
          stageStart + params.spinDelay + params.spinTime,
          stageStart + params.moveDelay + params.moveTime,
        );
        tl.fromTo(
          splitText.fades,
          { value: 1 },
          {
            value: 0,
            duration: params.textOutTime,
            ease: params.textOutEase,
            stagger: params.textStagger,
          },
          Math.max(0, landed + params.textOutAt),
        );
      }

      // The column arrives with the heading, by which point there is a front
      // for it to be reading.
      if (listEl) {
        tl.fromTo(
          listEl,
          { opacity: 0 },
          { opacity: 1, duration: params.textTime, ease: params.textEase },
          textStart,
        );
      }

      return tl;
    };

    tag.build();
    tag.load(() => {
      if (!disposed) tag.build();
    });
    styleMeta();

    let tl = null;
    const replay = () => {
      tl?.kill();
      tl = build();
    };

    // The entry is built once, and not until the faces are in. Every glyph
    // mask is sized by the glyph inside it, and the timeline holds direct
    // references to the uniforms those masks own — so rebuilding the text
    // later means rebuilding the timeline, which snaps state back to zero and
    // restarts the whole entry. On a warm cache fonts resolve in milliseconds
    // and that was invisible; on a cold one they arrive late and it reads as
    // the page going blank and starting over.
    const startEntry = () => {
      if (disposed || tl) return;
      splitText.build();
      tag.build();
      styleMeta();
      replay();
    };

    // fonts.ready is reliable, but nothing here is worth a permanently blank
    // page if it ever is not.
    const fontFallback = setTimeout(startEntry, 3000);
    (document.fonts?.ready ?? Promise.resolve())
      .then(startEntry)
      .catch(startEntry);

    /* ------------------------------------------------------- dev controls */
    let gui;

    if (process.env.NODE_ENV === "development") {
      Promise.all([import("lil-gui"), import("./ring/gui")]).then(
        ([{ default: GUI }, { mountGui }]) => {
          if (disposed) return;
          gui = mountGui(GUI, {
            params,
            state,
            info,
            actions: {
              replay,
              refit: () => {
                refit();
                applyQuality();
                renderer.setSize(viewW, viewH);
              },
              styleMeta,
              setThreshold: meta.setThreshold,
              rebuildText: () => {
                splitText.build();
                replay();
              },
              rebuildTag: () => tag.build(),
              replayMeta: () => {
                announced = -1;
              },
              adoptWindow: () => {
                params.refWidth = Math.round(viewW);
                params.refHeight = Math.round(viewH);
                refit();
                applyQuality();
                renderer.setSize(viewW, viewH);
              },
            },
          });

          // REMOVE THIS IF YOU WANNA TWEAK
          gui.hide();
        },
      );
    }

    /* ---------------------------------------------------------------- loop */
    const start = performance.now();
    let prevT = start;
    let idleFrames = 0;
    let looping = false;
    let docLocked = false;

    const tick = () => {
      const now = performance.now();
      // Clamped, so a backgrounded tab does not resume with one huge step.
      const dt = Math.min(0.05, (now - prevT) / 1000);
      prevT = now;

      let justParked = false;

      if (interactive && !dragging && !pressing && !picking) {
        state.spin += spinVel * dt;
        spinVel *= Math.pow(params.damping, dt * 60);

        // How far off the nearest slot the ring is. Zero while snap is off,
        // which leaves the parking test below reading as it always did.
        let off = 0;

        if (params.snap) {
          const slot = TAU / Math.round(params.count);
          // Rate the damping alone bleeds velocity off at, in 1/s. What is
          // left to coast is exactly v / this.
          const decay = Math.max(0.01, -Math.log(params.damping) * 60);

          // A flick is left alone until it is nearly spent, and this is what
          // counts as nearly. Never lower than the speed that leaves half a
          // slot of coast: above that the slot it is heading for is still in
          // front of it, so the run-in can only carry on forward. Later than
          // that and it has to back up, which is the one thing that looks
          // wrong.
          const engage = Math.max(params.snapFrom, decay * slot * 0.5);
          // Half a slot down to a pixel is about 4.8 e-foldings, which is what
          // lets snapTime read back as seconds.
          const rate = 4.8 / Math.max(0.05, params.snapTime * (loFi ? 0.7 : 1));

          if (!settling && Math.abs(spinVel) < engage) {
            // Committed from where the coast alone would have left it, so it
            // carries on to the slot it was already heading for rather than
            // pulling up short. Measured off the seed and off wherever front
            // ended up, so a plane lands facing the viewer.
            const coast = state.spin + spinVel / decay;
            const phase = params.seed * DEG - frontAngle;
            const target = Math.round((coast + phase) / slot) * slot - phase;
            const dist = Math.abs(target - state.spin);
            if (dist < 0.0008 && Math.abs(spinVel) < 0.0015) {
              // Already on the slot. Re-entering snap from a standstill would
              // kick the ring every frame and keep the GPU drawing.
              state.spin = target;
              spinVel = 0;
            } else {
              snapTo = target;
              // Never quicker than it was already going, so the run-in can only
              // slow the ring down. Floored at what the worst case it can be
              // handed needs, or committing from a standstill caps itself at
              // zero and never moves.
              snapCap = Math.max(Math.abs(spinVel), slot * 0.5 * rate);
              settling = true;
            }
          }

          if (settling) {
            off = snapTo - state.spin;
            // Speed proportional to what is left: the ring runs in on an
            // exponential and stops dead on the slot. Tying speed to distance
            // is what makes overshoot impossible, and overshoot would read as
            // a click rather than a glide.
            const aim = Math.max(-snapCap, Math.min(snapCap, off * rate));
            spinVel += (aim - spinVel) * clamp01(rate * dt);
          }
        } else {
          settling = false;
        }

        // Parked. Left running, the last hundredth of a degree creeps on for
        // ever, so put it down exactly on the slot.
        if (Math.abs(spinVel) < 0.0015 && Math.abs(off) < 0.0008) {
          if (settling || spinVel !== 0) justParked = true;
          spinVel = 0;
          state.spin += off;
          settling = false;
          wheelCarry = 0;
        }
      }

      const parked =
        interactive &&
        !dragging &&
        !pressing &&
        !picking &&
        !settling &&
        Math.abs(spinVel) <= 0.0015 &&
        cursor.amt <= 0.01 &&
        cursor.wake <= 0.01 &&
        state.shift >= 0.999 &&
        state.progress >= 0.999;

      atlas.setPaused(pressing || dragging || settling);

      if (params.idleSkip && parked && !justParked) {
        idleFrames++;
      } else {
        idleFrames = 0;
      }

      tickLoader(dt);
      updatePointer(dt);
      layout(dt);

      if (textGroup.visible && state.shift > 0.99) {
        let lit = false;
        const fades = splitText.fades;
        for (let i = 0; i < fades.length; i++) {
          if (fades[i].value > 0.01) {
            lit = true;
            break;
          }
        }
        if (!lit) textGroup.visible = false;
      }

      // The name arrives with the card, not while one flicks past. A pick
      // drives spin by tween, so spinVel is zero throughout — without that
      // test the meta would morph as the ring passed the halfway mark.
      if (
        interactive &&
        !dragging &&
        !picking &&
        !settling &&
        spinVel === 0 &&
        shown >= 0 &&
        shown !== announced
      ) {
        announced = shown;
        meta.show(shown);
      }

      // Draw every frame while the ring is moving. While parked, skip most
      // draws so the phone is not cooking a full-screen shader at 60fps, but
      // never skip the layout above — and keep a keep-alive draw so iOS does
      // not drop the program and hitch the next swipe.
      if (!(params.idleSkip && parked && !justParked && idleFrames % 8 !== 0)) {
        uniforms.uTime.value = (now - start) * 0.001;
        renderer.render(scene, camera);
      }
    };

    const setLoop = (on) => {
      if (on === looping) return;
      looping = on;
      renderer.setAnimationLoop(on ? tick : null);
    };

    const applyStage = (on) => {
      if (disposed) return;
      if (on) {
        document.documentElement.classList.add("ring-lock");
        if (!docLocked) {
          document.addEventListener("touchmove", lockTouchScroll, {
            passive: false,
          });
          docLocked = true;
        }
        gsap.set(canvas, { opacity: 1 });
        refit();
        applyQuality();
        renderer.setSize(viewW, viewH);
        setLoop(true);
        return;
      }

      document.documentElement.classList.remove("ring-lock");
      if (docLocked) {
        document.removeEventListener("touchmove", lockTouchScroll);
        docLocked = false;
      }
      openGen += 1;
      stopPick();
      // Keep ticking until the entry can finish; otherwise the counter never
      // opens and the timeline stays paused at the seed.
      if (interactive) setLoop(false);
    };

    stageApiRef.current = applyStage;
    setLoop(true);
    applyStage(activeRef.current);

    return () => {
      disposed = true;
      stageApiRef.current = null;
      pickProjectRef.current = null;
      stopPick();
      clearTimeout(holdTimer);
      clearTimeout(launchTimer);
      clearTimeout(fontFallback);
      renderer.setAnimationLoop(null);

      document.documentElement.classList.remove("ring-lock");
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onViewportShift);
      window.visualViewport?.removeEventListener("scroll", onViewportShift);
      coarseMQ.removeEventListener?.("change", onResize);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchmove", lockTouchScroll);
      document.removeEventListener("touchmove", lockTouchScroll);

      tl?.kill();
      gsap.killTweensOf(splitText.chars);
      gsap.killTweensOf(splitText.fades);
      gsap.killTweensOf(listEl);
      meta.dispose();
      tag.dispose();
      splitText.dispose();
      gui?.destroy();

      mesh.geometry.dispose();
      mesh.material.dispose();
      uniforms.uAtlas.value?.dispose();
      uniforms.uTagTex.value?.dispose();

      // dispose() frees GL resources but leaves the context itself alive until
      // the canvas is collected, which is not deterministic. This effect
      // re-runs on every StrictMode double mount and every hot update, so
      // without an explicit release they pile up, and once the browser's limit
      // is reached the renderer above cannot be constructed at all.
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
    // ringKey is the deal's identity. Listing `ring` would tear the GL
    // context down on every parent render even when nothing in it changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey]);

  return (
    <>
      {/* touch-none, or the browser claims the gesture for panning and the
          pointermove stream dies mid-drag. Nothing here scrolls — the swipe
          is the carousel. */}
      <div ref={containerRef} className="ring-stage" />

      <BrandMark className="pointer-events-auto fixed left-[max(12px,env(safe-area-inset-left))] top-[max(12px,env(safe-area-inset-top))] z-20" />

      {/* Never takes the pointer: the canvas underneath handles the wheel and
          the drag, and the column has no business interrupting a throw that
          happens to pass under it. Sized from styleMeta, not a class, so it
          takes the narrow bump with every other label. */}
      <ul
        ref={listRef}
        role="list"
        aria-label="Projects"
        style={{
          fontFamily: '"Satoshi", ui-sans-serif, system-ui, sans-serif',
        }}
        className="pointer-events-auto fixed right-[12vw] top-[2.4vh] z-10 flex flex-col items-end text-right leading-[1.4] tracking-[0.01em] text-[#0a0a0a] opacity-0 max-sm:hidden"
      >
        {ring.map((p, i) => (
          <li
            key={p.slug ?? p.file}
            ref={(el) => {
              itemsRef.current[i] = el;
            }}
            // No transition, deliberately: the colour turns over the moment
            // the ring passes the halfway point between two slots.
            style={{ opacity: 0.2 }}
          >
            <button
              type="button"
              onClick={() => pickProjectRef.current?.(i)}
              className="cursor-pointer border-0 bg-transparent p-0 text-right font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit] text-[#0a0a0a] [font-family:inherit]"
              aria-label={`Show ${p.name}`}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>

      {/* The canvas is the visual control, but these links keep every project
          reachable without a pointer. They stay visually quiet until focused,
          so the index keeps its role as a readout rather than becoming a menu. */}
      <nav
        aria-label="Project navigation"
        className="pointer-events-none fixed left-0 top-0 z-50"
      >
        <ul>
          {ring.map((p, i) => (
            <li key={`accessible-${p.slug ?? p.file}`}>
              <a
                href={`/work/${p.slug}`}
                className="sr-only rounded-sm bg-[#fafafa] px-4 py-3 text-sm text-[#0a0a0a] outline-2 outline-offset-2 outline-[#0a0a0a] focus:pointer-events-auto focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
              >
                {String(i + 1).padStart(2, "0")} {p.name}, {p.type}, {p.year}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Three rows per side, identical in structure and all carrying both
          words: two inside the filtered wrapper that melt into each other, and
          one outside it for words carrying over unchanged. Which row paints
          what is decided per change — see ring/meta.js.

          Hidden from the accessibility tree; a card is announced once, in
          full, from the live region below. */}
      {[
        { side: "left", justify: "flex-start" },
        { side: "right", justify: "flex-end" },
      ].map(({ side, justify }) => {
        // Baseline, not centre: the halves are set at different sizes, and a
        // shared baseline is what makes them read as one lockup.
        const row = (
          <span className="flex items-baseline whitespace-nowrap">
            <span />
            <span />
          </span>
        );
        return (
          <div
            key={side}
            ref={(el) => {
              metaRef.current[side].box = el;
            }}
            aria-hidden="true"
            className="pointer-events-none fixed top-1/2 z-10 -translate-y-1/2 tracking-[-0.01em] text-[#0a0a0a]"
          >
            <span
              ref={(el) => {
                metaRef.current[side].goo = el;
              }}
              className="absolute inset-0"
              // Promoted up front, so switching the goo on and off is not also
              // a compositor layer being created and thrown away.
              style={{ willChange: "filter" }}
            >
              {[0, 1].map((i) => (
                <span
                  key={i}
                  ref={(el) => {
                    metaRef.current[side].layers[i] = el;
                  }}
                  className="absolute inset-0 flex items-center"
                  style={{ justifyContent: justify }}
                >
                  {row}
                </span>
              ))}
            </span>
            <span
              ref={(el) => {
                metaRef.current[side].plain = el;
              }}
              className="absolute inset-0 flex items-center"
              style={{ justifyContent: justify }}
            >
              {row}
            </span>
          </div>
        );
      })}

      {/* Charging clock + 001–100. Holds the entry at the seed until 100. */}
      <div
        ref={loaderRef}
        role="status"
        aria-live="polite"
        aria-label="Charging"
        className="ring-loader pointer-events-none"
      >
        <span className="ring-loader-label">Charging</span>
        <span data-loader-count className="ring-loader-count">
          001
        </span>
        <span data-loader-time className="ring-loader-time">
          0:00
        </span>
      </div>

      <div ref={liveRef} aria-live="polite" className="sr-only" />

      <Link
        href="/book"
        prefetch={false}
        className="glass-btn glass-btn--cta glass-btn--solid pointer-events-auto fixed bottom-[2.4vh] right-[4vw] z-20"
      >
        Start a project
        <span aria-hidden="true">→</span>
      </Link>

      {/* Alpha multiplied up hard and biased down, so a pixel is either fully
          opaque or gone. That is what fuses two blurred words into one
          silhouette instead of laying them over each other. Region is
          oversized because the blur bleeds well outside the text's own box. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0"
        focusable="false"
      >
        <defs>
          <filter
            id="name-goo"
            x="-20%"
            y="-100%"
            width="140%"
            height="300%"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              ref={cutRef}
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
}
