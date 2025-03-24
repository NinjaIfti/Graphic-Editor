import $ from 'jquery';
import { canvas } from "../app.js";
import { filters } from 'fabric';

// Apply Filter Fn
const applyFilter = (index, filter) => {
    let obj = canvas.getActiveObject();
    if (!obj) return false;
    if (obj.type === 'image') {
        obj.filters[index] = filter;
        obj.applyFilters();
        canvas.renderAll();
    }
}

// Get Filter fn
function getFilter(index) {
    let obj = canvas.getActiveObject();
    if (!obj) return false;
    if (obj.type === 'image') return obj.filters[index];
}

// Apply Filter Value
function applyFilterValue(index, prop, value) {
    let obj = canvas.getActiveObject();
    if (!obj) return false;
    if (obj.type !== 'image') return false;

    if (obj.filters[index]) {
        obj.filters[index][prop] = value;
        obj.applyFilters();
        canvas.renderAll();
    }
}

// Reset All Filters
function resetAllFilter() {
    let obj = canvas.getActiveObject();
    if (!obj) return false;
    if (obj.type !== 'image') return;
    obj.filters = [];
    obj.applyFilters();
    canvas.renderAll();
}

// Function to apply a specific filter
function generateFilterPreview(type) {
    let obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') return;

    let filter;
    switch (type) {
        case 'black_white':
            filter = new filters.Grayscale();
            break;
        case 'brownie':
            filter = new filters.Brownie();
            break;
        case 'grayscale':
            filter = new filters.Grayscale();
            break;
        case 'invert':
            filter = new filters.Invert();
            break;
        case 'sepia':
            filter = new filters.Sepia();
            break;
        case 'kodachrome':
            filter = new filters.Kodachrome();
            break;
        case 'technicolor':
            filter = new filters.Technicolor();
            break;
        case 'polaroid':
            filter = new filters.Polaroid();
            break;
        case 'sharpen':
            filter = new filters.Convolute({
                matrix: [
                    0, -1, 0,
                    -1, 5, -1,
                    0, -1, 0
                ]
            });
            break;
        case 'emboss':
            filter = new filters.Convolute({
                matrix: [
                    1, 1, 1,
                    1, 0.7, -1,
                    -1, -1, -1
                ]
            });
            break;
        case 'vintage':
            filter = new filters.Vintage();
            break;
        default:
            return;
    }

    obj.filters = [filter]; // Apply single filter
    obj.applyFilters();
    canvas.renderAll();
}

// Filter Apply with amount
function filterApplyOnImage(filterType, amount) {
    let amountVal = null;
    switch (filterType) {
        case 'vibrance':
            applyFilter(8, true && new filters.Vibrance({
                vibrance: parseFloat(amount),
            }));
            break;
        case 'saturation':
            applyFilter(7, true && new filters.Saturation({
                saturation: parseFloat(amount),
            }));
            break;
        case 'hue':
            applyFilter(21, true && new filters.HueRotation({
                rotation: amount,
            }));
            break;
        case 'brightness':
            applyFilter(5, true && new filters.Brightness({
                brightness: parseFloat(amount)
            }));
            break;
        case 'contrast':
            applyFilter(6, true && new filters.Contrast({
                contrast: parseFloat(amount)
            }));
        case 'sharpen':
            amountVal = (amount == 0) ? false : true;
            applyFilter(12, amountVal && new filters.Convolute({
                matrix: [0, -1, 0,
                    -1, 5, -1,
                    0, -1, 0
                ]
            }));
            break;
        case 'blur':
            applyFilter(11, true && new filters.Blur({
                value: parseFloat(amount)
            }));
            applyFilterValue(11, 'blur', parseFloat(amount, 10));
            break;
        case 'pixelate':
            applyFilter(10, true && new filters.Pixelate({
                blocksize: parseInt(amount, 10)
            }));
            applyFilterValue(10, 'blocksize', parseInt(amount, 10));
            break;
        case 'noise':
            amountVal = (amount == 0) ? false : true;
            applyFilter(9, amountVal && new filters.Noise({
                noise: parseInt(amount, 10)
            }));
            break;
        case 'emboss':
            amountVal = (amount == 0) ? false : true;
            applyFilter(13, amountVal && new filters.Convolute({
                matrix: [1, 1, 1,
                    1, 0.7, -1,
                    -1, -1, -1
                ]
            }));
            break;
        default:
            break;
    }
}

//#region Event Listeners

// Filter Apply sliders
$(document).on('input change', ".image-filters .filter-inp", function () {
    let sliderFilter = $(this).data("filter"),
        amount = parseFloat($(this).val());
    filterApplyOnImage(sliderFilter, amount);
});

// Filter Previews
$(document).on("click", ".filter-previews .single-filter", function () {
    let filter = $(this).dataVal("filter");
    generateFilterPreview(filter);
});

// Filters Reset
$(document).on('click', ".reset-filter-btn", function () {
    resetAllFilter();
});
//#endregion Event Listeners 
