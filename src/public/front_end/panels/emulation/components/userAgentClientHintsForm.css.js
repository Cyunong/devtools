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

:host {
  --client-hints-form-icon-color: var(--color-text-primary);
}

.root {
  color: var(--color-text-primary);
  width: 100%;
}

.tree-title {
  font-weight: 700;
  display: flex;
  align-items: center;
}

.rotate-icon {
  transform: rotate(-90deg);
}

.form-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  align-items: center;
  column-gap: 10px;
  row-gap: 8px;
  padding: 0 10px;
}

.full-row {
  grid-column: 1 / 5;
}

.half-row {
  grid-column: span 2;
}

.mobile-checkbox-container {
  display: flex;
}

.device-model-input {
  grid-column: 1 / 4;
}

.input-field {
  color: var(--color-text-primary);
  padding: 3px 6px;
  border: none;
  border-radius: 2px;
  box-shadow: var(--legacy-focus-ring-inactive-shadow);
  background-color: var(--color-background);
  font-size: inherit;
  height: 18px;
}

.input-field:focus {
  box-shadow: var(--legacy-focus-ring-active-shadow);
  outline-width: 0;
}

.add-container {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-icon {
  margin-right: 5px;
}

.delete-icon {
  cursor: pointer;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}

.brand-row > input {
  width: 100%;
}

.info-link {
  display: flex;
  align-items: center;
  margin-left: 5px;
}

.submit-button {
  border: none;
  border-radius: 2px;
  font-weight: normal;
  height: 24px;
  font-size: 12px;
  padding: 0 12px;
  cursor: pointer;
  background-color: var(--color-primary-variant);
  color: var(--color-text-primary);
}

.hide-container {
  display: none;
}

.input-field-label-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (forced-colors: active) {
  :host {
    --client-hints-form-icon-color: fieldtext;
  }

  .input-field {
    border: 1px solid;
  }

  .tree-title[aria-disabled='true'] {
    color: GrayText;
  }
}

/*# sourceURL=userAgentClientHintsForm.css */
`);
export default styles;
