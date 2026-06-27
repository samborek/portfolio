---
title: Hydration
short_title: Hydration
layout: project
category: DeFi
year: 2024
order: 1000
cover: /images/work/hydration_1.jpg
hero_image: /images/work/hydration_1.jpg
mobile_first_slide: /images/work/hydration_1.jpg
preview_extra:
  - /images/work/hydration_1.jpg
# Trial: static image plus raw WebGL shader. Revert first carousel item to
# /images/work/hydration.json and remove shader_effect to restore Unicorn.
shader_effect: soft-ripple
# Hexo dev server applies these after save/refresh; static /public output needs `npm run build`.
shader_settings:
  # Overall image displacement strength. Higher = more watery/smeared image movement.
  distortion: 6.72
  # Amount of bright cursor sheen and ripple highlight. 0 disables extra light.
  light: 0.72
  # Global animation clock speed for the shader.
  speed: 0.28
  # How fast ripple rings expand away from cursor/touch points.
  ripple_speed: 1.58
  # How long ripple energy stays visible before fading.
  ripple_fade: 1.28
  # Trail length behind cursor movement. Higher = longer falloff tail.
  tail: 2.42
  # How many ripple samples are laid down along cursor movement. Higher = denser/longer mouse trail.
  trail_density: 0.5
  # How much cursor/ripple motion can deform the image mask edge.
  edge: 1.56
  # Mouse-follow smoothing. Higher = slower, more delayed follow.
  cursor_lag: 1.12
  # Cursor influence radius. Higher = wider distortion area around pointer.
  cursor_area: 0.20
  # Cursor falloff steepness. Higher = tighter/faster fade from pointer.
  cursor_falloff: 8.6
  # Ripple spatial width. Higher = broader rings and wake.
  ripple_area: 0.2
  # Ripple overlap smoothing. Higher = less stagger/stacking, but softer detail.
  ripple_smoothing: 0.7
  # RGB channel split near active distortion. Higher = stronger chromatic fringe.
  chromatic_aberration: 0.13
carousel:
  - /images/work/hydration_1.jpg
  - light: /images/work/hydration_2.jpg
    dark: /images/work/hydration_2_dark.jpg
  - light: /images/work/hydration_3.jpg
    dark: /images/work/hydration_3_dark.jpg
  - light: /images/work/hydration_4.jpg
    dark: /images/work/hydration_4_dark.jpg
  - light: /images/work/hydration_5.jpg
    dark: /images/work/hydration_5_dark.jpg
  - light: /images/work/hydration_6.jpg
    dark: /images/work/hydration_6_dark.jpg
carousel_object_fit: cover
disable_parallax: true
topbar_light: true
carousel_image_scale: 1.05
client: Hydration Protocol
role: "Lead Product Designer"
theme_hint: "Try Dark Mode"
intro: "Decentralized exchange & lending platform"
problem: "The existing interface felt fragmented and inconsistent, making complex DeFi operations confusing for users. The brand identity lacked cohesion, and the mobile experience was an afterthought."
solution: "Handled a complete UI overhaul with a unified, simple design language, built a comprehensive design tokens system for consistency and easy theming, and updated the mobile-first approach to make DeFi accessible anywhere."
scope:
  - Design System
  - Design Tokens
  - UI/UX Design
  - Prototyping
  - QA
  - 3D Icons
credits:
  - role: Brand
    name: Properly Studio
when: 2024/25
website: https://next-hydration.netlify.app/
---

Complete redesign of former HydraDX interface after rebrand to Hydration. The project involved expanding the user experience in multiple areas, establishing a robust design tokens architecture, and delivering a native feeling mobile of experience.
