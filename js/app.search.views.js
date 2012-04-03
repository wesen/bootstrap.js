define(["pagination"], function (Pagination) {
  /***************************************************************************
   *
   * Views
   *
   ***************************************************************************/

  var SearchView = HandlebarsView.extend({
    template: "#search-template",

    initialize: function () {
      _.bindAll();

      this.timeout = undefined;
      this.searchFilters = this.options.searchFilters;
      this.searchers = this.options.searchers;
    },

    events: {
      "click [name=search]": "search",
      "submit form":         "search"
    },

    onSearchSuccess: function (data, query) {
    },

    onSearchError: function (error, query) {
    },

    onSearchStart: function (query) {
      var that = this;

      clearTimeout(this.timeout);
      var $bar = that.$(".bar");
      $bar.width("50%").addClass("active");
      $bar.parent().addClass("progress-striped active progress-info");
      that.$("[name=search]").button("loading");
    },

    onSearchFinish: function (query) {
      var that = this;

      var $bar = that.$(".bar");
      $bar.width("100%").removeClass("active");
      $bar.parent().removeClass("progress-striped active").addClass("progress-info");
      this.timeout = setTimeout(function () {
        $bar.width("0%");
      }, 2000);

      that.$("[name=search]").button("reset");
    },

    serializeData: function () {
      var json = this.model.toJSON();
      json.searchers = _.map(this.searchers, function (searcher) {
        var res = _.clone(searcher);
        res.selected = json.searcherUrl === res.url;
        return res;
      });

      return json;
    },

    search: function () {
      this.model.set({filters: []});
      this.searchFilters.resetFilters();
      this.model.search();

      return false;
    },

    beforeRender: function () {
      this.$("[rel=tooltip]").tooltip("hide");
    },

    onRender: function () {
      this.unbindAll();

      this.delegateEvents();
      this.$(".btn-group").button();
      this.$("[name=search]").button();
      this.$("[rel=tooltip]").tooltip();

      Backbone.ModelBinding.bind(this, {all: "name"});
    }
  });

  var FilterView = HandlebarsView.extend({
    template: "#filters-template",

    cutoff: 10,

    events: {
      "click .filter": "toggleFilter"
    },

    initialize: function (options) {
      _.bindAll(this);
      this.searchQuery = this.options.searchQuery;
    },

    serializeData: function () {
      return this.model.toExplicitJSON(this.cutoff);
    },

    toggleFilter: function (ev) {
      var $target = $(ev.target);
      var filterId = $target.data("filter-id");
      var valueId = "" + $target.data("value-id");

      var prev = this.model.isFilterSelected(filterId, valueId);

      if (!ev.shiftKey) {
        this.model.unselectFiltersWithKey(filterId);
      }

      if (prev) {
        this.model.unselectFilter(filterId, valueId);
        $target.parent("li").removeClass("active");
      } else {
        this.model.selectFilter(filterId, valueId);
        $target.parent("li").addClass("active");
      }

      this.searchQuery.set({filters: this.model.get("selectedFilters")});
      this.searchQuery.search();
      return false;
    },

    render: function () {
      HandlebarsView.prototype.render.apply(this, arguments);
    },

    onRender: function () {
      this.delegateEvents();
    }
  });

  var FilterListView = HandlebarsView.extend({
    template: "#filter-list-template",

    events: {
      "click .filter": "deleteFilter"
    },

    initialize: function () {
      _.bindAll(this, "render", "deleteFilter");
      this.searchQuery = this.options.searchQuery;
      this.model.unbind("change", this.render);
      this.model.bind("change:selectedFilters", this.render);
    },

    deleteFilter: function (ev) {
      var $target = $(ev.target);
      var filterId = $target.data("filter-id");
      var valueId = "" + $target.data("value-id");
      this.model.unselectFilter(filterId, valueId);
      this.searchQuery.set({filters: this.model.get("selectedFilters")});
      this.searchQuery.search();
    },

    serializeData: function () {
      return this.model.toExplicitJSON();
    },

    onRender: function () {
      this.delegateEvents();
    }
  });

  var ResultsView = HandlebarsView.extend({
    template: "#results-template",

    initialize: function () {
      _.bindAll(this);
    },

    popupSearchError: function (_error, query) {
      this.popupAlert({
        message: "Error " + _error.status + ": " + _error.statusText,
        title: "Search error",
        type:  "error"
      });
    },

    popupSearchResults: function (data, query) {
      this.popupAlert({
        message: "Got " + data.total_hits + " results",
        title:   "Search success",
        type:    "success",
        popup:   true,
        fadeOut: 1000,
        el:      "#resultView",
        after:   true
      });
    },

    onRender: function () {
//      this.$("[rel=popover]").popover();
    }
  });

  var ResultsPaginationView = HandlebarsView.extend({
    template: "#results-pagination-template",

    events: {
      "click a": "goPage"
    },

    initialize: function (options) {
      this.searchQuery = options.searchQuery;
      _.bindAll(this);
    },

    serializeData: function () {
      var pagination = new Pagination({
        currentPage: this.model.get("page_no") + 1,
        perPage: this.model.get("page_size")
      });
      pagination.paginate(this.model.get("total_hits"));
      var data = pagination.toJSON();
      return data;
    },

    goPage: function (ev) {
      var $target = this.$(ev.target);
      var page = $target.data("page");

      this.searchQuery.set({page_no: page - 1});
      this.searchQuery.search();

      return false;
    }
  });

  return {
    FilterListView: FilterListView,
    ResultsView: ResultsView,
    SearchView: SearchView,
    FilterView: FilterView,
    ResultsPaginationView: ResultsPaginationView
  };

});