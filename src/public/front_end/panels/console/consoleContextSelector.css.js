// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const styles = new CSSStyleSheet();
styles.replaceSync(
`/*
 * Copyright 2017 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 2px 1px 2px 2px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  height: 36px;
  justify-content: center;
  overflow-y: auto;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 0;
}

.badge {
  pointer-events: none;
  margin-right: 4px;
  display: inline-block;
  height: 15px;
}

.subtitle {
  color: var(--color-text-secondary);
  margin-right: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 0;
}

:host(.highlighted) .subtitle {
  color: inherit;
}

/*# sourceURL=consoleContextSelector.css */
`);
export default styles;
