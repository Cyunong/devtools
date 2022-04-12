// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const styles = new CSSStyleSheet();
styles.replaceSync(
`/**
 * Copyright 2017 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.styles-element-classes-pane {
  background-color: var(--color-background-elevation-1);
  border-bottom: 1px solid var(--color-details-hairline);
  padding: 6px 2px 2px;
}

.styles-element-classes-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.styles-element-classes-pane [is=dt-checkbox] {
  margin-right: 15px;
}

.styles-element-classes-pane .title-container {
  padding-bottom: 2px;
}

.styles-element-classes-pane .new-class-input {
  padding-left: 3px;
  padding-right: 3px;
  overflow: hidden;
  border: 1px solid var(--input-outline);
  line-height: 15px;
  margin-left: 3px;
  width: calc(100% - 7px);
  background-color: var(--color-background);
  cursor: text;
}

/*# sourceURL=classesPaneWidget.css */
`);
export default styles;
