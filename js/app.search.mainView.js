define(["app.search.models", "app.search.views"], function (SearchModels, SearchViews) {
  var MainView = HandlebarsView.extend({
    template: "#main-template",

    subRegions: {
      searchRegion:     "#searchView",
      filterRegion:     "#filterView",
      resultRegion:     "#resultView",
      filterListRegion: "#filterListView",
      paginationRegion: "#paginationView"
    },

    initialize: function (options) {
      this.app = this.options.app;
      this.searchers = this.options.searchers;

      this.searchQuery = new SearchModels.SearchQuery({app: this.app, searcherUrl: this.searchers[0].url});
      this.searchResults = new SearchModels.SearchResults();
      this.searchFilters = new SearchModels.SearchFilters();

      this.searchView =     new SearchViews.SearchView({model: this.searchQuery, searchFilters: this.searchFilters, searchers: this.searchers});
      this.filterView =     new SearchViews.FilterView({model: this.searchFilters, searchQuery: this.searchQuery });
      this.resultView =     new SearchViews.ResultsView({model: this.searchResults});
      this.filterListView = new SearchViews.FilterListView({model: this.searchFilters, searchQuery: this.searchQuery});
      this.resultPaginationView = new SearchViews.ResultsPaginationView({model: this.searchResults, searchQuery: this.searchQuery});

      this.controller = _.extend({
        onSearchStart: function (query) {
          this.searchView.onSearchStart(query);
        },

        onSearchFinish: function (query, url) {
          this.searchView.onSearchFinish(query);
        },

        onSearchSuccess: function (data, query, url) {
          this.resultView.popupSearchResults(data, query);
          this.searchResults.set(_.extend(data, { searchUrl: url  }));
          this.searchFilters.setResultFilters(data);
        },

        onSearchFail: function (error, query) {
          this.resultView.popupSearchError(error, query);
        }
      }, Backbone.Marionette.BindTo);

      this.searchQuery.bindAll({
        "search:success": this.controller.onSearchSuccess,
        "search:fail": this.controller.onSearchFail,
        "search:start": this.controller.onSearchStart,
        "search:finish": this.controller.onSearchFinish
      }, this);
    },

    onShow: function () {
      this.app.addRegions(this.subRegions);

      this.app.searchRegion.show(this.searchView);
      this.app.filterRegion.show(this.filterView);
      this.app.filterListRegion.show(this.filterListView);
      this.app.resultRegion.show(this.resultView);
      this.app.paginationRegion.show(this.resultPaginationView);
    },

    onClose: function () {
      var that = this;
      _.each(this.subRegions, function (v, k) {
        that.app[k].close();
      });

      this.controller.unbindAll();
    }
  });

  return { MainView: MainView };
});