import $ from 'jquery';
// #region Folding Card

// Toggle Folding Card
function toggleFoldingCard($card) {
    let $header = $card.find(".card-header"),
        $body = $card.find('.card-body');

    // Add Class
    $header.toggleClass('active');
    let slide = $header.hasClass('active') ? 'slideDown' : 'slideUp';
    $body[slide](200);
}

// Toggle Folding Card 
$(document).on('click', ".folding-card .card-header:not(:has(.switch-btn))", function (e) {
    toggleFoldingCard($(this).parents(".folding-card"));
});

// #endregion Folding Card


// Enable Hr Dropdown
$(document).ready(function () {

    const targets = document.querySelectorAll("[data-horizontal-scroll='true']");
    if (targets) {
        Array.from(targets).forEach(target => {

            target.addEventListener("wheel", function (e) {
                e.preventDefault();
                this.scrollLeft += e.deltaY;
            }, { passive: false });

        })
    }
});

//#region Editor Dropdown
$(document).on("click", ".editor-dropdown .dropdown-toggle-item", function () {
    let $dropdown = $(this).parents(".editor-dropdown").first();
    $dropdown.toggleClass("active");
});

// On click on item
$(document).on("click", ".editor-dropdown .dropdown-body .menu .item", function () {
    let value = $(this).attr("value"),
        html = $(this).clone().html(),
        $parent = $(this).parents(".editor-dropdown");
    $parent.attr("value", value);
    $parent.find('.dropdown-toggle-item .item-html').html(html);
    $parent.removeClass('active');

    $parent.find('.menu .item').removeClass('selected');
    $(this).addClass("selected");

    $parent.trigger("change");
});
// Event Listner to close dropdown
$(document).on("click", function (e) {
    let $target = $(e.target);
    if ($target.parents(".editor-dropdown").length) return false;
    $('.editor-dropdown').removeClass("active");
});

//#endregion Editor Dropdown

//#region Sync Inputs
$(document).on("input", "[data-sync-with]", function () {
    let radius = $(this).dataVal("radius", 'body'),
        $target = $(this).parents(radius).find($(this).dataVal("sync-with")),
        val = $(this).val();
    $target.val(val);
});

//#endregion Sync Inputs 

$(document).on("change", ".switch-btn .toggle-input", function (e) {
    e.stopPropagation();
    e.preventDefault();
    let $card = $(this).parents(".folding-card"),
        checked = $(this).is(":checked");
    if ($card.length)
        toggleFoldingCard($card);
});

//#region Nav Tabs
$(document).on("click", ".nav-tabs .tab-items .tab-btn", function () {
    let type = $(this).dataVal("panel"),
        $parent = $(this).parents('.nav-tabs'),
        $panel = $parent.find(`.tab-panels .tab-panel#${type}`);

    $parent.find(".tab-panels .tab-panel").removeClass("active");
    $(".nav-tabs .tab-items .tab-btn").removeClass("active")

    $(this).addClass('active');
    $panel.addClass('active');
});
//#endregion Nav Tabs