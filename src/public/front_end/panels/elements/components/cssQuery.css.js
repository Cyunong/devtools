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

.query:not(.editing-query) {
  overflow: hidden;
}

.editable .query-text {
  color: var(--color-text-primary);
}

.editable .query-text:hover {
  text-decoration: var(--override-styles-section-text-hover-text-decoration);
  cursor: var(--override-styles-section-text-hover-cursor);
}

/*# sourceURL=cssQuery.css */
`);
export default styles;
