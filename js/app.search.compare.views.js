define(["app.search.compare", "app.search.views", "app.search.mainView"],
function (SearchCompare, SearchViews, SearchMainView) {

  var SearchCompareView = SearchViews.SearchView.extend({
    template: "#diff-search-template",

    initialize: function (options) {
      SearchViews.SearchView.prototype.initialize.apply(this, arguments);
      this.model.set("searcherUrl", this.model.get("searcherUrl2"));

      this.comparer = this.options.comparer;
    },

    search: function (ev) {
      this.model.set({filters: []});

      this.comparer.compare(this.model,
      this.model.get("searcherUrl"),
      this.model.get("searcherUrl2"));

      return false;
    }
  });

  var CompareResultsView = HandlebarsView.extend({
    template: "#compare-results-template",

    initialize: function (options) {
    },

    popupSearchResults: function (data, query) {
    }
  });

  var CompareMainView = SearchMainView.MainView.extend({
    template: "#main-template",

    initialize: function (options) {
      SearchMainView.MainView.prototype.initialize.apply(this, arguments);

      this.searchQuery.set({
        output_category: false,
        output_theme_page: false,
        output_product_variant: false,
        search_string: "ipad"
      });


      this.comparer = new SearchCompare();

      _.extend(this.controller, {
        onCompareStart: function (q1, q2) {
        },

        onCompareFinish: function (q1, q2) {
        },

        onCompareSuccess: function (diff, q1, q2, d1, d2) {
        },

        onCompareError: function (q1, q2, e1, e2) {
        }
      });

      this.searchView = new SearchCompareView({
        model: this.searchQuery,
        comparer: this.comparer,
        searchFilters: this.searchFilters,
        searchers: this.searchers});

      this.resultView = new CompareResultsView({
        model: this.comparer
      });

      this.comparer.bindAll({
        "compare:success": this.controller.onCompareSuccess,
        "compare:fail": this.controller.onCompareError,
        "compare:start": this.controller.onCompareStart,
        "compare:finish": this.controller.onCompareFinish
      });
    }
  });

  return {
    SearchCompareView: SearchCompareView,
    CompareMainView: CompareMainView
  };
});