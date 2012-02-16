define(["backbone.bootstrap", "app.search.models", "app.search.views"], function (BootStrap, searchModels, searchViews) {
  require("backbone.bootstrap");

  /***************************************************************************
   *
   * The actual application
   *
   ***************************************************************************/

  /**
   * @extends Backbone.Marionette.Application
   */
  var App = new Backbone.Marionette.Application(/** @lends App */{
//  searcherUrl: "http://localhost:8080/search-service/Searcherv1",
//  searcherUrl: "http://searcher-00.toi.api.maastricht:8080/search-service/Searcherv1"
    searcherUrl: "http://searcher-00.search.vps.maastricht:8080/search-service/Searcherv1",
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

  App.Classes.Views.MainView = HandlebarsView.extend({
    template: "#main-template",

    onShow: function () {
      /** @type Backbone.Marionette.Application */
      var App = require("app");
      App.addRegions({
      });

      App.searchRegion.show(App.Views.searchView);
      App.filterRegion.show(App.Views.filterView);
      App.filterListRegion.show(App.Views.filterListView);
      App.resultRegion.show(App.Views.resultView);
    }
  });

  App.Classes.Views.NavigationView = HandlebarsView.extend({
    template: "#navigation-template"
  });

  App.Views.mainView = new App.Classes.Views.MainView();
  App.Views.searchView =     new App.Classes.Views.SearchView({model: App.searchQuery, app: App});
  App.Views.filterView =     new App.Classes.Views.FilterView({model: App.searchFilters, app: App});
  App.Views.resultView =     new App.Classes.Views.ResultsView({model: App.searchResults, app: App});
  App.Views.filterListView = new App.Classes.Views.FilterListView({model: App.searchFilters, app: App});
  App.Views.navigationView = new App.Classes.Views.NavigationView();

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
    mainRegion:       "#main",
    searchRegion:     "#searchView",
    filterRegion:     "#filterView",
    resultRegion:     "#resultView",
    jsonDiffRegion:   "#jsonDiffView",
    filterListRegion: "#filterListView"
  });

  App.Controllers.routeController = {
    showMain: function () {
      App.mainRegion.show(App.Views.mainView);
    }
  };

  App.addInitializer(function (options) {
    this.navigationRegion.show(this.Views.navigationView);
    App.vent.bind("search:success", App.Controllers.searchController.onSearchSuccess).bind("search:fail", App.Controllers.searchController.onSearchError);

    /* create router */
    this.Routers.appRouter = new AppRouter({controller: App.Controllers.routeController});
    if (Backbone.history) {
      Backbone.history.start();
    }
  });

  return App;
});
