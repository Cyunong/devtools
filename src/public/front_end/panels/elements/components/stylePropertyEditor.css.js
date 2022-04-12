// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const styles = new CSSStyleSheet();
styles.replaceSync(
`/*
 * Copyright 2021 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.container {
  padding: 12px;
  min-width: 170px;
}

.row {
  padding: 0;
  color: var(--color-text-primary);
  padding-bottom: 16px;
}

.row:last-child {
  padding-bottom: 0;
}

.property {
  padding-bottom: 4px;
  white-space: nowrap;
}

.property-name {
  color: var(--color-syntax-1);
}

.property-value {
  color: var(--color-text-primary);
}

.property-value.not-authored {
  color: var(--color-text-disabled);
}

.buttons {
  display: flex;
  flex-direction: row;
}

.buttons > :first-child {
  border-radius: 3px 0 0 3px;
}

.buttons > :last-child {
  border-radius: 0 3px 3px 0;
}

.button {
  border: 1px solid var(--color-background-elevation-2);
  background-color: var(--color-background);
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.button:focus-visible {
  outline: auto 5px -webkit-focus-ring-color;
}

.button devtools-icon {
  --icon-color: var(--color-text-secondary);
}

.button.selected {
  background-color: var(--color-background-elevation-1);
}

.button.selected devtools-icon {
  --icon-color: var(--color-primary);
}

/*# sourceURL=stylePropertyEditor.css */
`);
export default styles;
