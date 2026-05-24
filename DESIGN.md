---
name: Clinical Precision
colors:
  surface: '#fbfaf0'
  surface-dim: '#dbdad2'
  surface-bright: '#fbfaf0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4eb'
  surface-container: '#efeee5'
  surface-container-high: '#e9e8df'
  surface-container-highest: '#e4e3da'
  on-surface: '#1b1c17'
  on-surface-variant: '#444748'
  inverse-surface: '#30312b'
  inverse-on-surface: '#f2f1e8'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5d5f5b'
  on-secondary: '#ffffff'
  secondary-container: '#e0e0db'
  on-secondary-container: '#62635f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c18'
  on-tertiary-container: '#83847e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e3e3de'
  secondary-fixed-dim: '#c6c7c2'
  on-secondary-fixed: '#1a1c19'
  on-secondary-fixed-variant: '#454744'
  tertiary-fixed: '#e3e3dc'
  tertiary-fixed-dim: '#c7c7c0'
  on-tertiary-fixed: '#1a1c18'
  on-tertiary-fixed-variant: '#464742'
  background: '#fbfaf0'
  on-background: '#1b1c17'
  surface-variant: '#e4e3da'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 32px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-lg: 48px
  stack-md: 24px
---

## Brand & Style

This design system is built on the principles of **high-end minimalism and clinical precision**. It targets an audience that values clarity, efficiency, and a sophisticated, "gallery-like" aesthetic. The goal is to evoke a sense of calm authority and absolute organization.

The visual style is a fusion of **Swiss Design and Modern Minimalism**. It prioritizes extreme legibility, generous whitespace, and a reduction of decorative elements. By removing visual noise, the content is elevated to the primary focus. The interface should feel intentional, structured, and premium through its restraint rather than its ornamentation.

## Colors

The palette utilizes the "Atelier Paper" collection to provide a warm, organic undertone to an otherwise clinical structure.

*   **Primary (#1A1A1A):** Used for typography and high-signal interactive states. It provides the necessary contrast against the light backgrounds.
*   **Secondary (#F5F5F0):** The foundational "Paper" color. This should be the primary background for all screens, replacing pure white to reduce eye strain and add a premium feel.
*   **Tertiary (#E8E8E1):** Used for structural elements like dividers, input backgrounds, and subtle containers.
*   **Neutral (#A0A098):** Reserved for secondary information, disabled states, and meta-data.

Avoid using vibrant colors. Success, error, or warning states should be communicated through iconography and clear labeling rather than aggressive color fills.

## Typography

The design system standardizes on **Inter** for all text roles to ensure a systematic, neutral, and highly readable experience. 

- **Headlines:** Use tighter letter-spacing and medium weights to create a strong visual anchor.
- **Body:** Prioritize line height (1.5x minimum) to ensure long-form text remains approachable and clear.
- **Labels:** Use uppercase with increased letter-spacing for small-scale utility text to maintain a clinical, organized feel.
- **Visual Noise:** Remove all italics and underlines unless strictly necessary for links within body copy. Use font weight and scale as the primary tools for hierarchy.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy on desktop and a **Fluid Grid** on mobile.

- **Desktop:** 12-column grid with a maximum width of 1280px. Large 64px outer margins create a "gallery" frame effect around the content.
- **Mobile:** 4-column grid with 20px margins.
- **Rhythm:** All spacing must be a multiple of the 8px base unit. 
- **Whitespace:** Increase vertical padding between logical sections (`stack-lg`) to allow the design to "breathe." Content should never feel cramped; if in doubt, add more space.

## Elevation & Depth

To maintain a clinical and minimalistic feel, this design system avoids traditional shadows entirely. 

Depth is achieved through **Tonal Layers** and **Low-Contrast Outlines**:
- **Layer 0:** Secondary Color (#F5F5F0) as the global canvas.
- **Layer 1:** Tertiary Color (#E8E8E1) for cards, surfaces, or navigation bars.
- **Outlines:** Use 1px solid borders in the Tertiary color for all interactive elements (inputs, buttons, cards). 

This approach creates a "flat-yet-structured" look that emphasizes the grid and the precision of the layout.

## Shapes

The shape language is disciplined and geometric. 

- **Base Radius:** 4px (Soft). This provides a subtle hint of modern approachability while maintaining the architectural rigor of the design.
- **Exceptions:** No pill shapes or fully rounded circles are permitted for UI components (except for avatars). 
- **Consistency:** All borders must be 1px. Avoid varying border weights to ensure a uniform, clean visual density across the application.

## Components

- **Buttons:** Primary buttons use a solid #1A1A1A fill with white text. Secondary buttons use a 1px #1A1A1A border with no fill. Padding should be generous (12px 24px) to emphasize the clinical aesthetic.
- **Input Fields:** Use the Tertiary background (#E8E8E1) with no border for the default state, moving to a 1px Primary (#1A1A1A) border on focus. Labels should always be positioned above the field using the `label-sm` style.
- **Cards:** Cards should have no shadow. Use a 1px border (#E8E8E1) or a slight tonal shift to define the container.
- **Lists:** Use 1px horizontal dividers between items. Remove all bullet points; use indentation and the `label-sm` typography for list categories.
- **Chips:** Small, rectangular tags with 4px radius, using a Tertiary background and `label-sm` text.
- **Status Indicators:** Use small geometric shapes (e.g., a 6px square) rather than large colored badges to indicate status, maintaining the minimalist ethos.