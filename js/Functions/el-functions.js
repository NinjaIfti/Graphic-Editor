// js/Editor/Functions/el-functions.js
import Alpine from "alpinejs";

// Alpine.js directives and components for UI elements
document.addEventListener("alpine:init", () => {
  // Folding Card Component
  Alpine.data("foldingCard", () => ({
    isOpen: false,

    init() {
      // Initialize the card (optionally start open based on data attribute)
      this.isOpen = this.$el.getAttribute("data-open") === "true";
    },

    toggle() {
      this.isOpen = !this.isOpen;
    },
  }));

  // Horizontal Scroll Directive
  Alpine.directive("horizontal-scroll", (el) => {
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
  });

  // Dropdown Component
  Alpine.data("editorDropdown", () => ({
    isOpen: false,
    selectedValue: "",
    selectedHtml: "",

    init() {
      // Initialize with any pre-selected value
      this.selectedValue = this.$el.getAttribute("value") || "";
      const selectedItem = this.$el.querySelector(
        `.menu .item[value="${this.selectedValue}"]`
      );
      if (selectedItem) {
        this.selectedHtml = selectedItem.innerHTML;
        selectedItem.classList.add("selected");
      }

      // Close dropdown when clicking outside
      this.handleClickOutside = (event) => {
        if (!this.$el.contains(event.target)) {
          this.isOpen = false;
        }
      };

      document.addEventListener("click", this.handleClickOutside);
    },

    toggle() {
      this.isOpen = !this.isOpen;
    },

    selectItem(value, html, event) {
      this.selectedValue = value;
      this.selectedHtml = html;
      this.isOpen = false;

      // Remove selected class from all items
      this.$el.querySelectorAll(".menu .item").forEach((item) => {
        item.classList.remove("selected");
      });

      // Add selected class to clicked item
      event.target.classList.add("selected");

      // Set value attribute on dropdown
      this.$el.setAttribute("value", value);

      // Dispatch change event
      this.$el.dispatchEvent(new Event("change", { bubbles: true }));
    },

    // Clean up event listener
    destroy() {
      document.removeEventListener("click", this.handleClickOutside);
    },
  }));

  // Input Sync Directive
  Alpine.directive("sync", (el, { expression }) => {
    el.addEventListener("input", () => {
      const radius = el.getAttribute("data-radius") || "body";
      const targetSelector = el.getAttribute("data-sync-with");

      if (!targetSelector) return;

      // Find the closest container with the radius
      let container = el;
      while (container && !container.matches(radius)) {
        container = container.parentElement;
      }

      if (!container) return;

      // Find the target element
      const target = container.querySelector(targetSelector);
      if (target) {
        target.value = el.value;

        // Also trigger Alpine.js reactivity if the target has x-model
        if (target._x_model) {
          target._x_model.set(el.value);
        }
      }
    });
  });

  // Tabs Component
  Alpine.data("navTabs", () => ({
    activeTab: "",

    init() {
      // Initialize with the first tab or a specified default
      const defaultTab = this.$el.getAttribute("data-default-tab");
      const firstTabBtn = this.$el.querySelector(".tab-btn");

      if (defaultTab) {
        this.activeTab = defaultTab;
      } else if (firstTabBtn) {
        this.activeTab = firstTabBtn.getAttribute("data-panel");
      }
    },

    setActiveTab(tabId) {
      this.activeTab = tabId;
    },
  }));
});

// Initialize horizontal scroll on page load
document.addEventListener("DOMContentLoaded", () => {
  const targets = document.querySelectorAll('[data-horizontal-scroll="true"]');
  if (targets) {
    Array.from(targets).forEach((target) => {
      target.addEventListener(
        "wheel",
        function (e) {
          e.preventDefault();
          this.scrollLeft += e.deltaY;
        },
        { passive: false }
      );
    });
  }
});
