import { FabricObject } from "fabric";
//#region Active Object control properties change
FabricObject.ownDefaults.transparentCorners = false;
FabricObject.ownDefaults.borderColor = '#007bff';
FabricObject.ownDefaults.borderScaleFactor = 0.5;
FabricObject.ownDefaults.cornerStrokeColor = '#007bff';
FabricObject.ownDefaults.cornerColor = '#fff';
FabricObject.ownDefaults.cornerStyle = 'circle';
FabricObject.ownDefaults.cornerSize = 10;
FabricObject.ownDefaults.padding = 0;

FabricObject.prototype.setControlsVisibility({
    mt: false,
    mb: false,
    ml: true,
    mr: true,
    bl: true,
    br: true,
    tl: true,
    tr: true,
    mtr: true,
});
