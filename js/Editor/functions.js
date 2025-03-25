// js/Editor/functions.js
import { canvas } from "./app.js";
import { getRand, GLOBAL_COUNT } from "../Functions/functions.js";
import { layerReload, labelLayers } from "./panels/layers.js";
import { Group } from "fabric";
import * as fabric from "fabric";

// Create New Id
function createNewId() {
  return getRand(30);
}

// rgba Color Generator
function rgbaColorGenerator(color, opacity) {
  const rgbaColor =
    "rgba(" +
    parseInt(color.slice(-6, -4), 16) +
    "," +
    parseInt(color.slice(-4, -2), 16) +
    "," +
    parseInt(color.slice(-2), 16) +
    "," +
    opacity +
    ")";
  return rgbaColor;
}

// Change Curser Event
function changeCurserEvent(cursor = "default", targetCanvas = canvas) {
  if (cursor.indexOf(".") !== -1) {
    cursor = `url(${cursor}), auto`;
  }
  if (targetCanvas.defaultColor == cursor) return true;
  targetCanvas.defaultCursor = `${cursor}`;
  targetCanvas.hoverCursor = `${cursor}`;
  targetCanvas.moveCursor = `${cursor}`;
}

// Get canvas object by id
function getObjById(id) {
  let targetObject = null;
  canvas._objects.forEach((obj) => {
    if (targetObject) return true;
    if (obj.id == id) targetObject = obj;
    else if (obj._objects) {
      let groupObj = obj._objects.find((object) => object.id == id);
      if (groupObj) {
        targetObject = groupObj;
      }
    }
  });
  return targetObject;
}

// Check is active object
function isActiveObj() {
  return canvas.getActiveObject() ? true : false;
}
// Get Obj type
function getObjType(obj = null, fabricJSType = false) {
  if (!obj) obj = canvas.getActiveObject();
  if (!obj) return false;
  if (fabricJSType) return obj.type;
  return obj.originalItem.class;
}

function unGroupObjects() {
  let group = canvas.getActiveObject();
  if (!group) return false;
  if (group.type !== "group") return false;

  let objects = group._objects;
  canvas.remove(group);

  objects.forEach((obj) => {
    group.exitGroup(obj, false);
    canvas.add(obj);
  });

  canvas.renderAll();
  layerReload();
  canvas.renderAll();
  return true;
}

// active multiple object so create group fn
function createObjectsGroup() {
  let objects = canvas.getActiveObjects();
  if (objects < 2) return false;
  let upperObjId = objects[objects.length - 1].id,
    upperObjIndex = canvas._objects.findIndex((obj) => obj.id == upperObjId),
    id = createNewId(),
    group = new Group(objects, {
      id,
      originalItem: {
        id,
        type: "group",
        fileType: "group",
        class: "group",
      },
    });

  canvas.add(group);
  canvas.setActiveObject(group);
  objects.map((obj) => canvas.remove(obj));
  canvas.renderAll();

  layerReload();
  // New layer pattren
  let layersPattren = [];
  canvas.forEachObject((obj) => {
    if (obj.id == id) return true;
    layersPattren.push(obj.id);
  });
  layersPattren.splice(upperObjIndex - 1, 0, id);
  labelLayers(layersPattren.reverse());
  return true;
}

// Active Obj Position Change
function activeObjPositionChange(type) {
  let obj = canvas.getActiveObject();
  if (!type && !obj) return false;
  if (type === "bringForward") {
    canvas.bringObjectForward(obj);
  } else if (type === "sendBackwards") {
    canvas.sendObjectBackwards(obj);
  } else if (type === "bringToFront") {
    canvas.bringToFront(obj);
  } else if (type === "sendToBack") {
    canvas.sendToBack(obj);
  }
  canvas.renderAll();
  layerReload();
}

// Set active object
function setActiveObject_(object) {
  if (isObjInGroup(object.id)) {
    object.hasBorders = true;
    object.hasControls = false;
  }
  canvas.setActiveObject(object);
  canvas.renderAll();
}

// Check if obj is inside a group
function isObjInGroup(id) {
  let obj = getObjById(id);
  if (!obj) return false;
  return obj.group == undefined ? false : true;
}

export {
  createNewId,
  rgbaColorGenerator,
  changeCurserEvent,
  getObjById,
  isActiveObj,
  getObjType,
  unGroupObjects,
  createObjectsGroup,
  activeObjPositionChange,
  setActiveObject_,
  isObjInGroup,
};
