define(function(require, exports, module) {
  /***************************************************************************
   *
   * Views
   *
   ***************************************************************************/

  module.exports.SearchView = HandlebarsView.extend({
    template: "#search-template",

    initialize: function () {
      _.bindAll();

      var that = this;
      var timeout = undefined;

      this.app.vent.bind("search:start",
      function () {
        clearTimeout(timeout);
        var $bar = that.$(".bar");
        $bar.width("50%").addClass("active");
        $bar.parent().addClass("progress-striped active progress-info");
        that.$("[name=search]").button("loading");
      }).bind("search:finish", function () {
        var $bar = that.$(".bar");
        $bar.width("100%").removeClass("active");
        $bar.parent().removeClass("progress-striped active").addClass("progress-info");
        timeout = setTimeout(function () {
          $bar.width("0%");
        }, 2000);

        that.$("[name=search]").button("reset");
      });
    },

    events: {
      "click [name=search]": "search",
      "submit form":         "search",
      "change [name=searcher]": "setSearcherUrl"
    },

    setSearcherUrl: function (ev) {
      var url = $(ev.target).find(":selected").data("searcher-url");
      this.model.set({searcherUrl: url});
      return false;
    },

    serializeData: function () {
      var json = this.model.toJSON();
      json.searchers = _.map(this.options.searchers, function (searcher) {
        var res = _.clone(searcher);
        res.selected = json.searcherUrl === res.url;
        return res;
      });

      return json;
    },

    search: function () {
      var data = {
        search_string: this.$("[name=search_string]").val()
      };

      this.$(".btn").each(function (idx, btn) {
        var $btn = $(btn);
        if ($btn.attr("name") !== "search") {
          data[$btn.attr("name")] = $btn.hasClass("active");
        }
      });

      data.searcherUrl = this.$("option[selected=selected]").data("searcher-url");
      this.model.set(data);

      this.app.searchFilters.resetFilters();
      this.model.search(this.app.searchResults.get("selectedFilters"));

      return false;
    },

    beforeRender: function () {
      this.$("[rel=tooltip]").tooltip("hide");
    },

    onRender: function () {
      this.delegateEvents();
      this.$(".btn-group").button();
      this.$("[name=search]").button();
      this.$("[rel=tooltip]").tooltip();
    }
  });

  module.exports.FilterView = HandlebarsView.extend({
    template: "#filters-template",

    cutoff: 10,

    events: {
      "click .filter": "toggleFilter"
    },

    initialize: function () {
      _.bindAll(this);
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

      var App = require("app");
      App.searchQuery.search(this.model.get("selectedFilters"));
      return false;
    },

    onRender: function () {
      this.delegateEvents();
    }
  });

  module.exports.FilterListView = HandlebarsView.extend({
    template: "#filter-list-template",

    events: {
      "click .filter": "deleteFilter"
    },

    initialize: function () {
      _.bindAll(this, "render", "deleteFilter");
      this.model.unbind("change", this.render);
      this.model.bind("change:selectedFilters", this.render);
    },

    deleteFilter: function (ev) {
      var $target = $(ev.target);
      var filterId = $target.data("filter-id");
      var valueId = "" + $target.data("value-id");
      this.model.unselectFilter(filterId, valueId);
      this.app.searchQuery.search(this.model.get("selectedFilters"));
    },

    serializeData: function () {
      return this.model.toExplicitJSON();
    },

    onRender: function () {
      this.delegateEvents();
    }
  });

  module.exports.ResultsView = HandlebarsView.extend({
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
    }
  });
});