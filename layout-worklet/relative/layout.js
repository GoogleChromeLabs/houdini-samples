/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Implements a version of Android's RelativeLayout.
// https://android.googlesource.com/platform/frameworks/base.git/+/master/core/java/android/widget/RelativeLayout.java

// We accept "-" in all of the operators.
function normalizeOperator(operator) {
  switch (operator) {
    case "above":
      return "above";
    case "below":
      return "below";
    case "left-of":
    case "leftOf":
      return "leftOf";
    case "right-of":
    case "rightOf":
      return "rightOf";
    case "align-top":
    case "alignTop":
      return "alignTop";
    case "align-bottom":
    case "alignBottom":
      return "alignBottom";
    case "align-left":
    case "alignLeft":
      return "alignLeft";
    case "align-right":
    case "alignRight":
      return "alignRight";
    case "align-parent-top":
    case "alignParentTop":
      return "alignParentTop";
    case "align-parent-bottom":
    case "alignParentBottom":
      return "alignParentBottom";
    case "align-parent-left":
    case "alignParentLeft":
      return "alignParentLeft";
    case "align-parent-right":
    case "alignParentRight":
      return "alignParentRight";
    case "center-horizontal":
    case "centerHorizontal":
      return "centerHorizontal";
    case "center-vertical":
    case "centerVertical":
      return "centerVertical";
    default:
      return null;
  }
}

// Parses the --relative-constraints property, returning a map constraints.
function parseRelativeConstraints(str, inlineSize) {
  const parts = str.split(",").map(str => str.trim());
  const constraintList = str.split(",").map(str =>
    str
      .trim()
      .split(" ")
      .map(str2 => str2.trim())
  );
  const relativeConstraints = {};

  for (let part of parts) {
    const [constraintStr, queryStr] = part.split("/").map(str => str.trim());
    const constraint = constraintStr.split(" ").map(str => str.trim());
    const query = queryStr ? queryStr.split(" ").map(str => str.trim()) : "";
    if (constraint.length === 3 || constraint.length === 2) {
      const [target, op, dest] = constraint;

      const operator = normalizeOperator(op);
      if (!operator) continue;

      if (query.length == 2) {
        const [queryType, queryLength] = query;
        if (queryType === "min-width" && inlineSize < parseInt(queryLength)) {
          continue;
        }

        if (queryType === "max-width" && inlineSize >= parseInt(queryLength)) {
          continue;
        }
      }

      if (!relativeConstraints[target]) relativeConstraints[target] = {};

      relativeConstraints[target][normalizeOperator(op)] = dest || true;
    }
  }

  return relativeConstraints;
}

// Sorts the children based on the constraints. E.g. the constraint:
// b below a, c below b
// would return [a, b, c].
function sortChildren(relativeConstraints, childNames, mode) {
  const predecessorsByChild = {};
  for (let childName of childNames) {
    predecessorsByChild[childName] =
      mode === "vertical"
        ? getPredecessorsVertical(relativeConstraints, childName)
        : getPredecessorsHorizontal(relativeConstraints, childName);
  }

  let sortedSoFar = 0;
  let changed = true;

  while (changed) {
    changed = false;

    for (let i = sortedSoFar; i < childNames.length; i++) {
      const childName = childNames[i];
      const predecessors = predecessorsByChild[childName];
      if (predecessors.length === 0) {
        // Move element into sorted part of the list.
        if (i !== sortedSoFar) {
          const tmp = childNames[i];
          childNames[i] = childNames[sortedSoFar];
          childNames[sortedSoFar] = tmp;
        }

        sortedSoFar++;
        changed = true;

        // Remove this as a predecessor.
        for (let j = sortedSoFar; j < childNames.length; j++) {
          const l = predecessorsByChild[childNames[j]];
          const idx = l.indexOf(childName);
          if (idx >= 0) l.splice(idx, 1);
        }
      }
    }
  }

  if (sortedSoFar < childNames.length) {
    throw Error("Cycle in dependency graph.");
  }
}

function getPredecessorsVertical(relativeConstraints, childName) {
  let predecessors = [];

  const c = relativeConstraints[childName] || {};
  if (c.above) predecessors.push(c.above);

  if (c.below) predecessors.push(c.below);

  if (c.alignTop) predecessors.push(c.alignTop);

  if (c.alignBottom) predecessors.push(c.alignBottom);

  return predecessors;
}

function getPredecessorsHorizontal(relativeConstraints, childName) {
  let predecessors = [];

  const c = relativeConstraints[childName] || {};
  if (c.leftOf) predecessors.push(c.leftOf);

  if (c.rightOf) predecessors.push(c.rightOf);

  if (c.alignLeft) predecessors.push(c.alignLeft);

  if (c.alignRight) predecessors.push(c.alignRight);

  return predecessors;
}

function applyHorizontalRules(
  relativeConstraints,
  childPositions,
  childName,
  inlineSize
) {
  const position = childPositions[childName];
  position.left = -1;
  position.right = -1;

  const c = relativeConstraints[childName] || {};
  if (c.leftOf && childPositions[c.leftOf])
    position.right = childPositions[c.leftOf].left;

  if (c.rightOf && childPositions[c.rightOf])
    position.left = childPositions[c.rightOf].right;

  if (c.alignLeft && childPositions[c.alignLeft])
    position.left = childPositions[c.alignLeft].left;

  if (c.alignRight && childPositions[c.alignRight])
    position.right = childPositions[c.alignRight].right;

  if (c.alignParentLeft) position.left = 0;

  if (c.alignParentRight) position.right = inlineSize;
}

function applyVerticalRules(
  relativeConstraints,
  childPositions,
  childName,
  blockSize
) {
  const position = childPositions[childName];
  position.top = -1;
  position.bottom = -1;

  const c = relativeConstraints[childName] || {};
  if (c.above && childPositions[c.above])
    position.bottom = childPositions[c.above].top;

  if (c.below && childPositions[c.below])
    position.top = childPositions[c.below].bottom;

  if (c.alignTop && childPositions[c.alignTop])
    position.top = childPositions[c.alignTop].top;

  if (c.alignBottom && childPositions[c.alignBottom])
    position.bottom = childPositions[c.alignBottom].bottom;

  if (c.alignParentTop) position.top = 0;

  if (c.alignParentBottom && blockSize !== null) position.bottom = blockSize;
}

// Measures the child in the *inline* direction.
async function measureChildHorizontal(child, position) {
  let childInlineSize = 0;
  if (position.left >= 0 && position.right >= 0) {
    childInlineSize = Math.max(0, position.right - position.left);
  } else {
    childInlineSize = (await child.layoutNextFragment({})).inlineSize;
  }

  return childInlineSize;
}

// Measures the child in the *block* direction.
async function measureChild(child, position) {
  const childConstraints = {};

  if (position.top >= 0 && position.bottom >= 0)
    childConstraints.fixedBlockSize = Math.max(
      0,
      position.bottom - position.top
    );

  if (position.left >= 0 && position.right >= 0)
    childConstraints.fixedInlineSize = Math.max(
      0,
      position.right - position.left
    );

  return await child.layoutNextFragment(childConstraints);
}

// Positions a child in the *inline* direction.
function positionChildHorizontal(
  position,
  constraint,
  inlineSize,
  childInlineSize
) {
  if (position.left < 0 && position.right >= 0) {
    // Right fixed, left unspecified.
    position.left = position.right - childInlineSize;
  } else if (position.left >= 0 && position.right < 0) {
    position.right = position.left + childInlineSize;
  } else if (position.left < 0 && position.right < 0) {
    // Both unspecified.
    const c = constraint || {};
    if (c.centerHorizontal) {
      position.left = (inlineSize - childInlineSize) / 2;
      position.right = position.left + childInlineSize;
    } else {
      position.left = 0;
      position.right = childInlineSize;
    }
  }
}

// Positions a child in the *block* direction.
function positionChildVertical(
  position,
  constraint,
  blockSize,
  childBlockSize
) {
  if (position.top < 0 && position.bottom >= 0) {
    position.top = position.bottom - childBlockSize;
  } else if (position.top >= 0 && position.bottom < 0) {
    position.bottom = position.top + childBlockSize;
  } else if (position.top < 0 && position.bottom < 0) {
    // Both unspecified.
    const c = constraint || {};
    if (c.centerVertical && blockSize !== null) {
      position.top = (blockSize - childBlockSize) / 2;
      position.bottom = position.top + childBlockSize;
    } else {
      position.top = 0;
      position.bottom = childBlockSize;
    }
  }
}

registerLayout(
  "relative",
  class {
    static get inputProperties() {
      return ["--relative-constraints"];
    }
    static get childInputProperties() {
      return ["--relative-name"];
    }

    async intrinsicSizes() {}

    async layout(children, edges, constraints, styleMap) {
      const relativeConstraints = parseRelativeConstraints(
        styleMap.get("--relative-constraints").toString(),
        constraints.fixedInlineSize
      );

      const childrenMap = children.reduce((map, child) => {
        const val = child.styleMap.get("--relative-name");
        if (val && val.toString() !== "") {
          child.name = val.toString().trim();
          map[child.name] = child;
        }
        return map;
      }, {});

      const childPositions = Object.keys(childrenMap).reduce((map, key) => {
        map[key] = {};
        return map;
      }, {});

      const sortedChildNamesHorizontal = Object.keys(childrenMap);
      const sortedChildNamesVertical = Object.keys(childrenMap);
      sortChildren(
        relativeConstraints,
        sortedChildNamesHorizontal,
        "horizontal"
      );
      sortChildren(relativeConstraints, sortedChildNamesVertical, "vertical");

      for (let childName of sortedChildNamesHorizontal) {
        applyHorizontalRules(
          relativeConstraints,
          childPositions,
          childName,
          constraints.fixedInlineSize
        );
        const childInlineSize = await measureChildHorizontal(
          childrenMap[childName],
          childPositions[childName]
        );
        positionChildHorizontal(
          childPositions[childName],
          relativeConstraints[childName],
          constraints.fixedInlineSize,
          childInlineSize
        );
      }

      const childFragmentMap = {};
      for (let childName of sortedChildNamesVertical) {
        applyVerticalRules(
          relativeConstraints,
          childPositions,
          childName,
          constraints.fixedBlockSize
        );
        const fragment = await measureChild(
          childrenMap[childName],
          childPositions[childName]
        );
        childFragmentMap[childName] = fragment;
        positionChildVertical(
          childPositions[childName],
          relativeConstraints[childName],
          constraints.fixedBlockSize,
          fragment.blockSize
        );
      }

      let autoBlockSize = 0;
      const childFragments = [];
      for (let i = 0; i < children.length; i++) {
        const childName = children[i].name;
        const fragment = childName
          ? childFragmentMap[childName]
          : await children[i].layoutNextFragment({});
        childFragments.push(fragment);

        if (childName) {
          const position = childPositions[childName];
          fragment.inlineOffset = position.left;
          fragment.blockOffset = position.top;
        }

        autoBlockSize = Math.max(
          autoBlockSize,
          fragment.blockOffset + fragment.blockSize
        );
      }

      return { autoBlockSize, childFragments };
    }
  }
);
