define(function(require, exports, module) {
  /***************************************************************************
   *
   * Models
   *
   ***************************************************************************/

  var BilligerApi = require("billiger-api");

  /**
   * Represents a complete search query
   * @class
   * @extends Backbone.Model
   */
  module.exports.SearchQuery= Backbone.Model.extend(/** @lends SearchQuery */{
    defaults: {
      output_offer:       true,
      output_product:         true,
      output_didyoumean:       true,
      output_category:       false,
      output_theme_page:      false,
      output_product_variant: false,
      shopdiv:                 true,
      collect_filters:         false,
      collect_filter_keys:     false,
      fuzzy:                   true,
      search_string:           "",
      page_size:               17,
      page_no:                 0,
      sort:                    "relevance",
      filters:                 [],
      searcherUrl: "http://searcher-00.search.vps.maastricht:8080/search-service/Searcherv1"
    },

    /**
     * @return {string} a GET request string
     */
    paramString: function (filters) {
      var that = this;

      var params = {
        searchstring: this.attributes.search_string,
        page_size:    this.attributes.page_size,
        page_no:      this.attributes.page_no,
        sort:         this.attributes.sort
      };
      var opt_outs = [];
      if (!this.attributes.shopdiv) {
        opt_outs.push("shopdiv");
      }
      if (!this.attributes.fuzzy) {
        opt_outs.push("shopdiv");
      }
      if (this.attributes.collect_filters) {
        opt_outs.push("collect_filters");
      }
      if (this.attributes.collect_filter_keys) {
        opt_outs.push("collect_filter_keys");
      }
      if (!this.attributes.fuzzy) {
        opt_outs.push("fuzzy");
      }
      if (opt_outs.length > 0) {
        params.opt_out = opt_outs.join(",");
      }

      var outputs = [];
      _.each(["offer", "product", "theme_page", "product_variant", "category", "didyoumean"],
      function (type) {
        if (that.attributes["output_" + type]) {
          if (type == "didyoumean") {
            type += ":3";
          }
          outputs.push(type);
        }
      });

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

      str += "&debug=1";

      return str;
    },

    search: function () {
      var that = this;
      this.trigger("search:start", this);

      var params = this.paramString(this.get("filters"));
      console.log("searching on " + this.attributes.searcherUrl + "?" + params);
      var url = this.attributes.searcherUrl + "?" + params;

      var dfd = $.Deferred();

      $.get(this.attributes.searcherUrl, params).then(
      function (data) {
        data.page_no = that.attributes.page_no;
        data.page_size = that.attributes.page_size;
        that.trigger("search:success", data, this, url);
        dfd.resolve(data);
      }).fail(
      function (error) {
        that.trigger("search:fail", error, this, url);
        dfd.fail(error);
      }).always(function () {
        that.trigger("search:finish", this, url);
      });

      return dfd.promise();
    }
  });

  module.exports.SearchResults = Backbone.Model.extend({
    set: function (attrs, options) {
      var that = this;

      if (attrs.hits) {
        var _results = {};
        var typeIds = _.groupBy(attrs.hits, function (x) { return x[0]; });
        var dfds = _.map(typeIds, function (values, type) {
          var ids = _.map(values, function (x) { return x[1]; });
          return $.when(BilligerApi.getResults(type, ids)).then(function (results) {
            _results[type] = results;
          });
        });
        $.when.apply(this, dfds).done(function () {
          Backbone.Model.prototype.set.call(that,
          _.extend(attrs, {
            results: _results
          }), options);
        })
        .fail(function () {
          Backbone.Model.prototype.set.apply(this, arguments);
        });

      } else {
        Backbone.Model.prototype.set.apply(this, arguments);
      }
      return this;
    },

    getResultName: function (type, id) {
      if (this.attributes.results[type] && this.attributes.results[type][id]) {
        return this.attributes.results[type][id].name;
      } else {
        return id;
      }
    },

    getResult: function (type, id) {
      var result = this.attributes.results[type];
      if (result) {
        result = result[id];
      }
      result = result || {};
      return result;
    },

    toJSON: function () {
      var that = this;
      var json = Backbone.Model.prototype.toJSON.apply(this, arguments);

      var results = _.map(this.get("hits"), function (hit) {
        var result = that.getResult(hit[0], hit[1]);

        if (result.type) {
          result.category_type = result.type;
          delete result.type;
        }
        return _.extend({
          type:  module.exports.SearchResults.TYPES[hit[0]],
          id:    hit[1],
          score: hit[2]
        }, result);
      });

      var debug = this.get("debug");

      if (debug) {
        for (var i = 0; i < results.length; i++) {
          if (debug.paged_hits[i] && debug.paged_hits[i].explanation) {
            results[i].explanation = debug.paged_hits[i].explanation;
            results[i].docid = debug.paged_hits[i].doc;
          }
        }

        for (i = 0; i < debug.queries.length; i++) {
          debug.queries[i].num = i + 1;
        }

        for (i = 0; i < debug.categoryQueries.length; i++) {
          debug.categoryQueries[i].num = i + 1;
        }
      }

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
      selectedFilters: {},
      filterKeys: {},
      filterValues: {}
    },

    isFilterSelected: function (key, value) {
      return _.indexOf(this.attributes.selectedFilters[key], value) != -1;
    },

    set: function (attrs, options) {
      var that = this;
      if (attrs.filters) {
        var filterKeys = {};
        var filterValues = {};

        var dfds = _.map(attrs.filters, function (values, key) {
          filterKeys[key] = BilligerApi.getFilterKey(key);
          return $.when(BilligerApi.getValueNames(key, _.without(_.keys(values), "__TRUNCATED__"))).then(function (values) {
            filterValues[key] = values;
          });
        });

        $.when.apply(this, dfds).done(function () {
          Backbone.Model.prototype.set.call(that,
          _.extend(attrs, {
            filterKeys: filterKeys,
            filterValues: filterValues
          }), options);
        })
        .fail(function () {
          Backbone.Model.prototype.set.apply(this, arguments);
        });

      } else {
        Backbone.Model.prototype.set.apply(this, arguments);
      }

      return this;
    },

    getFilterKey: function (key) {
      return this.attributes.filterKeys[key] || key;
    },

    getFilterValue: function (key, value) {
      if (this.attributes.filterValues[key]) {
        return this.attributes.filterValues[key][value] || value;
      } else {
        return value;
      }
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
          data.push({key: key, value: value,
            keyName: that.getFilterKey(key),
            valueName: that.getFilterValue(key, value)});
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
            valueName: that.getFilterValue(key, value),
            count:    count,
            selected: that.isFilterSelected(key, value)
          };
        }), function (elt) {
          return -elt.count;
        });

        return {
          key:  key,
          keyName: that.getFilterKey(key),
          count:      totalCount,
          values:     _.first(values, cutoff),
          truncated: values.length > cutoff,
          valueCount: values.length,
          singleValue: values.length === 1
        };
      });
      data = _.filter(data, function (elt) {
        return elt.key !== "price";
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