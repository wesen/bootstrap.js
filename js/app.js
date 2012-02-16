define(["backbone.bootstrap", "app.search.models", "app.search.views"], function (BootStrap, searchModels, searchViews) {
  require("backbone.bootstrap");

  /***************************************************************************
   *
   * The actual application
   *
   ***************************************************************************/

  /**
   * @type Backbone.Marionette.Application
   */
  var App = new Backbone.Marionette.Application(/** @lends App */{
    Classes: {
      Models: {},
      Views: {}
    },
    Views: {},
    Routers: {},
    Controllers: {}
  });

  App.Classes.Models = searchModels;
  App.Classes.Views  = searchViews;

  App.searchQuery = new App.Classes.Models.SearchQuery({app: App});
  App.searchResults = new App.Classes.Models.SearchResults();
  App.searchFilters = new App.Classes.Models.SearchFilters();

  var AppRouter = Backbone.Marionette.AppRouter.extend({
    appRoutes: {
      "":     "showMain",
      "diff": "showDiff"
    }
  });

  App.Classes.Views.NavigationView = HandlebarsView.extend({
    template: "#navigation-template"
  });

  App.Classes.Views.MainView = HandlebarsView.extend({
    template: "#main-template",

    subRegions: {
      searchRegion:     "#searchView",
      filterRegion:     "#filterView",
      resultRegion:     "#resultView",
      filterListRegion: "#filterListView"
    },

    initialize: function () {
      this.searchView =     new App.Classes.Views.SearchView({model: App.searchQuery, app: App});
      this.filterView =     new App.Classes.Views.FilterView({model: App.searchFilters, app: App});
      this.resultView =     new App.Classes.Views.ResultsView({model: App.searchResults, app: App});
      this.filterListView = new App.Classes.Views.FilterListView({model: App.searchFilters, app: App});

      this.controller = _.extend({
        onSearchSuccess: function (data, query) {
          this.resultView.popupSearchResults(data, query);
          App.searchResults.set(data);
          App.searchFilters.setResultFilters(data);
        },

        onSearchFail: function (error, query) {
          this.resultView.popupSearchError(error, query);
        }
      }, Backbone.Marionette.BindTo);
    },

    onShow: function () {
      App.addRegions(this.subRegions);

      App.searchRegion.show(this.searchView);
      App.filterRegion.show(this.filterView);
      App.filterListRegion.show(this.filterListView);
      App.resultRegion.show(this.resultView);

      this.controller.bindTo(App.vent, "search:success", this.controller.onSearchSuccess, this);
      this.controller.bindTo(App.vent, "search:fail", this.controller.onSearchFail, this);
    },

    onClose: function () {
      _.each(this.subRegions, function (v, k) {
        App[k].close();
      });

      this.controller.unbindAll();
    }
  });

  App.Views.mainView = new App.Classes.Views.MainView();
  App.Views.navigationView = new App.Classes.Views.NavigationView();

  App.addRegions({
    navigationRegion: ".navbar",
    mainRegion:       "#main",
    jsonDiffRegion:   "#jsonDiffView"
  });

  App.Controllers.routeController = {
    showMain: function () {
      App.mainRegion.show(App.Views.mainView);
    }
  };

  App.addInitializer(function (options) {
    this.navigationRegion.show(this.Views.navigationView);

    App.vent.proxy(App.searchQuery, "search:success", "search:fail", "search:start", "search:finish");

    /* create router */
    this.Routers.appRouter = new AppRouter({controller: App.Controllers.routeController});
    if (Backbone.history) {
      Backbone.history.start();
    }
  });

  return App;
});
