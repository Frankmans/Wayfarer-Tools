// Copyright 2025 tehstone, bilde2910
// This file is part of the Unified Wayfarer Tools collection.

// This script is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This script is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You can find a copy of the GNU General Public License in the root
// directory of this script's GitHub repository:
// <https://github.com/bilde2910/Wayfarer-Tools/blob/main/LICENSE>
// If not, see <https://www.gnu.org/licenses/>.

import { untilTruthy } from "./utils";

/**
 * redesign: the header the status badges used to sit in (next to wf-logo) no longer exists. Badges
 * (skip count, appeal timer) are put in this shared stack, fixed to the bottom left above the review
 * counter. Style it with the .uwt-pill class (see scripts/uwt-core.css).
 */
export const uwtStatusStack = async (): Promise<HTMLElement> => {
  const body = await untilTruthy(() => document.body);
  let stack = document.getElementById("uwt-status-stack");
  if (stack === null) {
    stack = document.createElement("div");
    stack.id = "uwt-status-stack";
    body.appendChild(stack);
  }
  return stack;
};
