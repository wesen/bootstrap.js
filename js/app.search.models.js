define(function(require, exports, module) {
  /***************************************************************************
   *
   * Models
   *
   ***************************************************************************/

  /**
   * Represents a complete search query
   * @class
   * @extends Backbone.Model
   */
  module.exports.SearchQuery= Backbone.Model.extend(/** @lends SearchQuery */{
    defaults: {
      output_offers:       true,
      output_products:     true,
      shopdiv:             false,
      collect_filters:     false,
      collect_filter_keys: false,
      search_string:       "",
      page_size:           17,
      page_no:             0,
      sort:                "rating",
      filters:             []
    },

    /**
     * @return {string} a GET request string
     */
    paramString: function (filters) {
      var params = {
        searchstring: this.attributes.search_string,
        page_size:    this.attributes.page_size,
        page_no:      this.attributes.page_no,
        sort:         this.attributes.sort
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

      var _filters = _.map(filters || {}, function (values, key) {
        if (values.length > 0) {
          return "filter=" + key + ":" + values.join("|");
        } else {
          return undefined;
        }
      });

      if (_filters.length > 0) {
        str += "&" + _.without(_filters, undefined).join("&");
      }

      return str;
    },

    search: function (filters) {
      var App = require("app");

      App.vent.trigger("search:start", this);

      return $.get(App.searcherUrl, this.paramString(filters)).then(
      function (data) {
        App.vent.trigger("search:success", data, this);
      }).fail(
      function (error) {
        App.vent.trigger("search:fail", error, this);
      }).always(function () {
        App.vent.trigger("search:finish", this);
      });
    }
  });

  module.exports.SearchResults = Backbone.Model.extend({
    toJSON: function () {
      var json = Backbone.Model.prototype.toJSON.apply(this, arguments);

      var results = _.map(this.get("hits"), function (hit) {
        return {
          type:  module.exports.SearchResults.TYPES[hit[0]],
          id:    hit[1],
          score: hit[2]
        };
      });
      json.hits = results;
      return json;
    }
  });

  module.exports.SearchResults.TYPES = [
    "offer", "product", "category", "theme page", "product variant"
  ];

  module.exports.SearchFilters = Backbone.Model.extend({
    defaults: {
      filters:         [],
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
});