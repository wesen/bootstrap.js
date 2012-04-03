define(["backbone.bootstrap", "app.search.mainView", "app.search.compare.views", "billiger-api"],
function (BootStrap, SearchMainView, CompareViews, BilligerApi) {
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
    Controllers: {},
    Config: {}
  });


  App.Config.Searchers = [
    { url: "http://localhost:8080/search-service/Searcherv1",
      name: "localhost"
    }
];

  App.Router = Backbone.Marionette.AppRouter.extend({
    appRoutes: {
      "":     "showMain",
      "diff": "showDiff"
    }
  });

  App.Classes.Views.NavigationView = HandlebarsView.extend({
    template: "#navigation-template"
  });


  App.Views.mainView = new SearchMainView.MainView({ app: App, searchers: App.Config.Searchers });
  App.Views.diffView = new CompareViews.CompareMainView({ app: App, searchers: App.Config.Searchers });
  App.Views.navigationView = new App.Classes.Views.NavigationView();

  App.addRegions({
    navigationRegion: ".navbar",
    mainRegion:       "#main"
  });

  App.Controllers.routeController = {
    showMain: function () {
      App.mainRegion.show(App.Views.mainView);
    },

    showDiff: function () {
      App.mainRegion.show(App.Views.diffView);
    }
  };

  App.addInitializer(function (options) {
    this.navigationRegion.show(this.Views.navigationView);
    window.api = this.billigerApi = BilligerApi;

    /* create router */
    this.Routers.appRouter = new App.Router({controller: App.Controllers.routeController});
    if (Backbone.history) {
      Backbone.history.start();
    }
  });

  window.App = App;
  return App;
});
