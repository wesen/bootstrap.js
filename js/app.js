/**
 * Your app here
 **/

/**
 * Override the backbone.marionette templatemanager to compile handlebars templates
 */
var HandleBarsTemplateCache = {};
Backbone.Marionette.TemplateManager.loadTemplate = function (templateId, callback) {
  var template = HandleBarsTemplateCache[templateId];

  if (template === undefined) {
    var tpl = $(templateId).html();
    template = HandleBarsTemplateCache[templateId] = Handlebars.compile(tpl);
  }

  callback.call(this, template);
};

/**
 * @class HandleBarsView
 * @extends Backbone.Marionette.ItemView
 */
var HandlebarsView = Backbone.Marionette.ItemView.extend(
/** @lends HandlebarsView */
{
  /**
   * Render a template using handlebars. The compiled template is returned by the TemplateManager.
   *
   * @param template the compiled template function
   * @param data the data
   *
   * @return the evaluated template
   */
  renderTemplate: function (template, data) {
    if (!template) {
      var err = new Error("A template must be specified");
      err.name = "NoTemplateError";
      throw err;
    }

    return template(data);
  },

  beforeRender: null,

  render: function () {
    if (this.beforeRender) {
      this.beforeRender();
    }

    return Backbone.Marionette.ItemView.prototype.render.apply(this, arguments);
  },

  createAlert: function (message) {
    var defaults = {
      template: "#alert-template",
      type: null
    };
    var options;
    if (typeof message === "string") {
      options = _.extend(defaults, {message: message});
    } else {
      options = _.extend(defaults, message);
    }
    var dfd = jQuery.Deferred();
    Backbone.Marionette.TemplateManager.get(options.template, function (tpl) {
      var html = tpl(options);
      $(html).alert();
      dfd.resolve(html);
    });

    return dfd.promise();
  },

  popupAlert: function (message) {
    var that = this;
    this.createAlert(message)
    .then(function (elt) {
      var $elt = $(elt);
      if (message.fadeOut) {
        setTimeout(function () {
          $elt.fadeOut();
        }, message.fadeOut);
      }
      var $parentEl = message.el ? $(message.el) : that.$el.parent();
      if (message.after) {
        $parentEl.append($elt.fadeIn('fast'));
      } else {
        $parentEl.prepend($elt.fadeIn('fast'));
      }
    });
  }
});

/***************************************************************************
 *
 * The actual application
 *
 ***************************************************************************/

var App = new Backbone.Marionette.Application(/** @lends App */{
//  searcherUrl: "http://localhost:8080/search-service/Searcherv1",
//  searcherUrl: "http://searcher-00.toi.api.maastricht:8080/search-service/Searcherv1"
  searcherUrl: "http://searcher-00.search.vps.maastricht:8080/search-service/Searcherv1"
});


/***************************************************************************
 *
 * Models
 *
 ***************************************************************************/

/**
 * Represents a complete search query
 *
 * @class SearchQuery
 * @extends Backbone.Model
 */
var SearchQuery = Backbone.Model.extend( /** @lends SearchQuery */{
  defaults: {
    output_offers: true,
    output_products: true,
    shopdiv: false,
    collect_filters: false,
    collect_filter_keys: false,
    search_string: "",
    page_size: 17,
    page_no: 0,
    sort: "rating",
    filters: []
  },

  /**
   * @return {string} a GET request string
   */
  paramString: function (filters) {
    var params = {
      searchstring: this.attributes.search_string,
      page_size: this.attributes.page_size,
      page_no: this.attributes.page_no,
      sort: this.attributes.sort
    };
    var opt_outs = [];
    if (this.attributes.shopdiv) {
      opt_outs.push("shopdiv");
    }
    if (this.attributes.collect_filters) {
      opt_outs.push("collect_filters");
    }
    if (this.attributes.collect_filter_keys) {
      opt_outs.push("collect_filter_keys");
    }
    if (opt_outs.length > 0) {
      params.opt_out = opt_outs.join(",");
    }

    var outputs = [];
    if (this.attributes.output_offers) {
      outputs.push("offer");
    }
    if (this.attributes.output_products) {
      outputs.push("product");
    }
    params.output = outputs.join(",");
    var str = $.param(params);

    var filters = _.map(filters || {},
    function (values, key) {
      if (values.length > 0) {
        return "filter=" + key + ":" + values.join("|");
      } else {
        return undefined;
      }
    });

    if (filters.length > 0) {
      str += "&" + _.without(filters, undefined).join("&");
    }

    return str;
  },

  search: function (filters) {
    App.vent.trigger("search:start", this);

    return $.get(App.searcherUrl, this.paramString(filters))
    .then(function (data) {
      App.vent.trigger("search:success", data, this);
    })
    .fail(function (error) {
      App.vent.trigger("search:fail", error, this);
    })
    .always(function () {
      App.vent.trigger("search:finish", this);
    });
  }
});

App.searchQuery = new SearchQuery();

var SearchResults = Backbone.Model.extend({
  toJSON: function () {
    var json = Backbone.Model.prototype.toJSON.apply(this, arguments);

    var results = _.map(this.get("hits"),
    function (hit) {
      return {
        type: SearchResults.TYPES[hit[0]],
        id: hit[1],
        score: hit[2]
      };
    });
    json.hits = results;
    return json;
  }
});

SearchResults.TYPES = [
  "offer",
  "product",
  "category",
  "theme page",
  "product variant"
];

App.searchResults = new SearchResults();

var SearchFilters = Backbone.Model.extend({
  defaults: {
    filters: [],
    selectedFilters: {}
  },

  isFilterSelected: function (key, value) {
    return _.indexOf(this.attributes.selectedFilters[key], value) != -1;
  },

  selectFilter: function (key, value, options) {
    options = options || {};
    var filters = this.get("selectedFilters");
    if (filters[key]) {
      filters[key].push(value);
    } else {
      filters[key] = [value];
    }
    this.set({selectedFilters: filters}, {silent: true});
    if (!options.silent) {
      this.trigger("change:selectedFilters");
      this.trigger("change");
    }

    return this;
  },

  unselectFilter: function (key, value, options) {
    options = options || {};
    var filters = this.get("selectedFilters");
    if (filters[key]) {
      filters[key] = _.without(filters[key], value);
    }
    this.set({selectedFilters: filters}, {silent: true});
    if (!options.silent) {
      this.trigger("change:selectedFilters");
      this.trigger("change");
    }

    return this;
  },

  unselectFiltersWithKey: function (key, options) {
    options = options || {};
    var filters = this.get("selectedFilters");
    delete filters[key];
    this.set({selectedFilters: filters}, {silent: true});

    if (!options.silent) {
      this.trigger("change:selectedFilters");
      this.trigger("change");
    }

    return this;
  },

  resetFilters: function (options) {
    this.set({selectedFilters: {}}, options);
  },

  toggleFilter: function (key, value, options) {
    if (this.isFilterSelected(key, value)) {
      this.unselectFilter(key, value, options);
      return false;
    } else {
      this.selectFilter(key, value, options);
      return true;
    }
  },

  setResultFilters: function (result, options) {
    this.set({filters: result.filters}, options);
  },

  toFilterListJSON: function () {
    var that = this;
    var data = [];

    _.each(this.attributes.selectedFilters, function (values, key) {
      _.each(values, function (value) {
        data.push({key: key, value: value});
      });
    });
    return data;
  },

  toExplicitJSON: function (cutoff) {
    cutoff = cutoff || 10;
    var that = this;
    var data;
    data = _.map(this.attributes.filters, function (counts, key) {
      var totalCount = 0;
      var values = _.sortBy(_.map(counts, function (count, value) {
        value = "" + value;
        totalCount += count;
        return {
          value:    value,
          count:    count,
          selected: that.isFilterSelected(key, value)
        };
      }), function (elt) {
        return -elt.count;
      });

      return {key:  key,
        count:      totalCount,
        values:     _.first(values, cutoff),
        truncated: values.length > cutoff,
        valueCount: values.length,
        singleValue: values.length === 1
      };
    });

    return {
      filters: _.sortBy(data, function (x) {
        return -x.count;
      }),

      selectedFilters: this.toFilterListJSON()
    };
  }
});

App.searchFilters = new SearchFilters();

/***************************************************************************
 *
 * Views
 *
 ***************************************************************************/

var MainView = HandlebarsView.extend({
  template: "#main-template",

  onShow: function () {
    App.addRegions({
    });

    App.searchRegion.show(App.Views.searchView);
    App.filterRegion.show(App.Views.filterView);
    App.filterListRegion.show(App.Views.filterListView);
    App.resultRegion.show(App.Views.resultView);
  }
});

var NavigationView = HandlebarsView.extend({
  template: "#navigation-template"
});

var SearchView = HandlebarsView.extend({
  template: "#search-template",

  initialize: function () {
    var that = this;
    var timeout = undefined;
    App.vent.bind("search:start", function () {
      clearTimeout(timeout);
      var $bar = that.$(".bar");
      $bar.width("50%").addClass("active");
      $bar.parent().addClass("progress-striped").addClass("progress-info");
      that.$("[name=search]").button("loading");
    })
    .bind("search:finish", function () {
      var $bar = that.$(".bar");
      $bar.width("100%").removeClass("active");
      $bar.parent().removeClass("progress-striped").addClass("progress-info");
      timeout = setTimeout(function () {
        $bar.width("0%");
      }, 2000);

      that.$("[name=search]").button("reset");
    });
  },

  events:
  {
    "click [name=search]": "search",
    "submit form": "search"
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
    this.model.set(data);

    App.searchFilters.resetFilters();
    this.model.search(App.searchResults.get("selectedFilters"));

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

var FilterView = HandlebarsView.extend({
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

    App.searchQuery.search(this.model.get("selectedFilters"));
    return false;
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
    this.model.unbind("change", this.render);
    this.model.bind("change:selectedFilters", this.render);
  },

  deleteFilter: function (ev) {
    var $target = $(ev.target);
    var filterId = $target.data("filter-id");
    var valueId = "" + $target.data("value-id");
    this.model.unselectFilter(filterId, valueId);
    App.searchQuery.search(this.model.get("selectedFilters"));
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
      type: "error"
    });
  },

  popupSearchResults: function (data, query) {
      this.popupAlert({
      message: "Got " + data.total_hits + " results",
      title: "Search success",
      type: "success",
      popup: true,
      fadeOut: 1000,
      el: "#resultView",
      after: true
    });
  },

  onRender: function () {
  }
});

var AppRouter = Backbone.Marionette.AppRouter.extend({
  appRoutes: {
    "":        "showMain",
    "diff":    "showDiff"
  }
});

App.Views = {
  mainView: new MainView(),
  searchView: new SearchView({model: App.searchQuery}),
  filterView: new FilterView({model: App.searchFilters}),
  resultView: new ResultsView({model: App.searchResults}),
  filterListView: new FilterListView({model: App.searchFilters}),
  navigationView: new NavigationView()
};

App.Controllers = {
};

App.Routers = {
};

App.Controllers.searchController = {
  onSearchSuccess: function (data, query) {
    App.Views.resultView.popupSearchResults(data, query);
    App.searchResults.set(data);
    App.searchFilters.setResultFilters(data);
  },

  onSearchError: function (error, query) {
    App.Views.resultView.popupSearchError(error, query);
  }
};

App.addRegions({
  navigationRegion: ".navbar",
  mainRegion: "#main",
  searchRegion: "#searchView",
  filterRegion: "#filterView",
  resultRegion: "#resultView",
  jsonDiffRegion: "#jsonDiffView",
  filterListRegion: "#filterListView"
});

App.Controllers.routeController = {
  showMain: function () {
    App.mainRegion.show(App.Views.mainView);
  }
};

App.addInitializer(function (options) {
  this.navigationRegion.show(this.Views.navigationView);
  App.vent.bind("search:success", App.Controllers.searchController.onSearchSuccess)
  .bind("search:fail", App.Controllers.searchController.onSearchError);

  /* create router */
  this.Routers.appRouter = new AppRouter({controller: App.Controllers.routeController});
  if (Backbone.history) {
    Backbone.history.start();
  }
});

App.start({debug: true});