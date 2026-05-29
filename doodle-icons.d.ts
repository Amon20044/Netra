declare module "doodle-icons" {
  import * as React from "react";

  /** Every doodle icon accepts the standard SVG element props (width, height, fill, …). */
  export type DoodleIcon = React.FC<React.SVGProps<SVGSVGElement>>;
  export type DoodleSet = Record<string, DoodleIcon>;

  export const Arrow: DoodleSet;
  export const Currency: DoodleSet;
  export const ECommerce: DoodleSet;
  export const Emojis: DoodleSet;
  export const Files: DoodleSet;
  export const Finance: DoodleSet;
  export const Food: DoodleSet;
  export const GenderSymbols: DoodleSet;
  export const HandGestures: DoodleSet;
  export const Health: DoodleSet;
  export const Interfaces: DoodleSet;
  export const Logos: DoodleSet;
  export const Misc: DoodleSet;
  export const Objects: DoodleSet;
  export const Weather: DoodleSet;
}
