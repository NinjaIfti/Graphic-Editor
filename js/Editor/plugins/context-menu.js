// Import fabric canvas and utility functions
import { canvas } from '../app.js';
import { toBoolean } from "../../Functions/functions.js";
import { createObjectsGroup, unGroupObjects, activeObjPositionChange } from '../functions.js';

// Initialize Alpine data for context menu functionality
document.addEventListener('alpine:init', () => {
  Alpine.data('contextMenu', () => ({
    show: false,
    posX: 0,
    posY: 0,
    isLocked: false,
    isGrouped: false,
    
    init() {
      // Initialize event listener for canvas right-click
      document.querySelector('.canvas-container').addEventListener('contextmenu', (e) => {
        // Get active object from Fabric.js canvas
        const obj = canvas.getActiveObject();
        
        // Hide menu if no objects or no active object
        if (!canvas._objects.length || !obj) {
          this.hideMenu();
          return false;
        }
        
        e.preventDefault();
        
        // Set properties based on active object
        const { type } = obj;
        this.isGrouped = type === 'group';
        this.isLocked = obj.lockMovementX === true;
        
        // Calculate menu position
        this.setMenuPosition(e);
        
        // Show menu
        this.show = true;
      });
      
      // Global click to hide menu
      window.addEventListener('click', (e) => {
        // Don't hide if clicking on the menu itself
        if (!e.target.closest('.context-menu')) {
          this.hideMenu();
        }
      });
    },
    
    // Set the position of the context menu based on screen boundaries
    setMenuPosition(e) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const menuWidth = 200; // Approximate width of menu
      const menuHeight = 300; // Approximate height of menu
      
      let left = e.pageX + 10;
      let top = e.pageY + 10;
      
      // Handle right edge of screen
      if ((left + menuWidth) >= windowWidth) {
        this.posX = windowWidth - menuWidth - 10;
      } else {
        this.posX = left;
      }
      
      // Handle bottom edge of screen
      if ((top + menuHeight) > windowHeight) {
        this.posY = windowHeight - menuHeight - 10;
      } else {
        this.posY = top;
      }
    },
    
    // Hide the context menu
    hideMenu() {
      this.show = false;
      document.querySelectorAll('.contextmenu-target').forEach(el => {
        el.classList.remove('selected');
      });
    },
    
    // Toggle lock/unlock on selected objects
    toggleLock() {
      this.isLocked = !this.isLocked;
      const objects = canvas.getActiveObjects();
      
      if (!objects.length) return false;
      
      objects.forEach(obj => {
        obj.set({
          lockMovementY: this.isLocked,
          lockMovementX: this.isLocked,
          lockScalingX: this.isLocked,
          lockScalingY: this.isLocked,
        });
      });
      
      canvas.renderAll();
      this.hideMenu();
    },
    
    // Toggle group/ungroup for selected objects
    toggleGroup() {
      if (!this.isGrouped) {
        const result = createObjectsGroup();
        if (result) this.isGrouped = true;
      } else {
        const result = unGroupObjects();
        if (result) this.isGrouped = false;
      }
      
      this.hideMenu();
    },
    
    // Change position of active object (bring forward/send backward)
    changeObjectPosition(type) {
      activeObjPositionChange(type);
      this.hideMenu();
    },
    
    // Delete selected object
    deleteObject() {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        canvas.remove(activeObject);
        canvas.renderAll();
        this.hideMenu();
      }
    }
  }));
});

// Export any functions that might need to be accessed from outside
export const showContextMenu = (element) => {
  const menuEl = document.querySelector(element);
  if (menuEl && menuEl.__x) {
    menuEl.__x.data.show = true;
  }
};

export const hideContextMenu = (element) => {
  const menuEl = document.querySelector(element);
  if (menuEl && menuEl.__x) {
    menuEl.__x.data.hideMenu();
  }
};