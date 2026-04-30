---
name: Luminous Intelligence
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3ff'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f4'
  surface-container-highest: '#e1e1ee'
  on-surface: '#191b24'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fc'
  outline: '#737687'
  outline-variant: '#c3c5d8'
  surface-tint: '#0051e0'
  primary: '#0051df'
  on-primary: '#ffffff'
  primary-container: '#2f6bff'
  on-primary-container: '#000318'
  inverse-primary: '#b5c4ff'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#a33e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cb4f00'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00174d'
  on-primary-fixed-variant: '#003cac'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7c2d00'
  background: '#faf8ff'
  on-background: '#191b24'
  surface-variant: '#e1e1ee'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 64px
  gutter: 24px
  margin: 40px
---

## Brand & Style
The design system is rooted in a **Minimalist Modern** aesthetic, designed to evoke a sense of maternal calm and high-end technical reliability. The philosophy prioritizes cognitive ease, using generous whitespace to allow complex AI data to breathe. The visual language avoids aggressive cues, instead opting for a "soft-tech" feel where the interface feels like a quiet, high-performance workspace. The target audience is sophisticated enterprise users who value clarity and precision over visual noise.

## Colors
This design system utilizes a high-clarity light theme. The background uses a cool-toned off-white to reduce screen glare, while cards utilize pure white to establish a clear information hierarchy. The primary blue is used sparingly for call-to-actions and active states to maintain the premium, calm vibe. Functional neutrals are biased toward slate and cool gray to complement the primary blue.

## Typography
The system relies exclusively on **Inter** for its systematic, utilitarian, and highly readable qualities. Headings are kept at a Medium (500) weight to provide structure without feeling heavy or aggressive. Body text follows a standard 16px baseline for accessibility. Letter spacing is slightly tightened on larger headlines to maintain a premium "tight" look and slightly increased on small labels for clarity.

## Layout & Spacing
This design system employs a **Fixed Grid** model for main content areas (max-width 1280px) and a fluid model for internal dashboard views. It uses an 8px spacing scale. Vertical rhythm is driven by generous `xxl` gaps between major sections to emphasize the whitespace-heavy aesthetic. Components within cards should prioritize `lg` (24px) internal padding to ensure the UI feels uncrowded.

## Elevation & Depth
Depth is created through **Tonal Layers** and extremely **Ambient Shadows**. The interface uses a flat base (Background) with elevated Surfaces (Cards). Shadows are intentionally faint (4% opacity) to suggest a subtle lift rather than a dramatic floating effect. High-contrast outlines are avoided; instead, use the `#E6E8EC` border to define boundaries. For interactive elements, a slight increase in shadow spread (from 12px to 20px) is used on hover to indicate tactility.

## Shapes
The shape language is **Rounded**, favoring organic curves over sharp geometric angles. Larger containers like cards use a 16px radius to feel soft and approachable. Interactive elements like buttons and input fields use a slightly tighter 10px radius to maintain a professional, functional appearance while still aligning with the overall soft-light theme.

## Components
- **Buttons**: Primary buttons use the `#2F6BFF` fill with white text and a 10px radius. Secondary buttons should use a ghost style with the `#E6E8EC` border and `#0F172A` text.
- **Main Cards**: Always use a white background, 16px radius, and the 4% opacity ambient shadow. Internal padding should be a minimum of 24px.
- **Inputs**: Text inputs feature a 10px radius, `#F6F7FB` light fill, and an `#E6E8EC` border. On focus, the border transitions to the primary blue with a 1px thickness.
- **Chips**: Small, 100px (Pill) rounded indicators. Use light blue tints for status or `#F6F7FB` for neutral categories.
- **Lists**: Clean rows with 1px bottom borders in `#E6E8EC`. Use `#0F172A` for primary list items and `#6B7280` for metadata.
- **AI-Specific Components**: Suggesting "Prompt Trays" (bottom-docked, slightly more elevated cards) and "Insight Toasts" (small cards with a 2px left-accent border in primary blue) to highlight AI-generated content.