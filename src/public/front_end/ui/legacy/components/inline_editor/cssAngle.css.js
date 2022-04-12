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

.css-angle {
  display: inline-block;
  position: relative;
  outline: none;
}

devtools-css-angle-swatch {
  display: inline-block;
  margin-right: 2px;
  user-select: none;
}

devtools-css-angle-editor {
  --override-dial-color: #a3a3a3;

  position: fixed;
  z-index: 2;
}

/*# sourceURL=cssAngle.css */
`);
export default styles;
