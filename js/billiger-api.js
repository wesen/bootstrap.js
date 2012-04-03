define([], function () {
  var BilligerApi = function (options) {
    this.options = _.options;
    if (this.initialize) this.initialize(options);
  };

  _.extend(BilligerApi.prototype, Backbone.Events, {
    initialize: function (options) {
      var that = this;
      this.get("get_all_filter_values").then(function (data) {
        that.filterValues = data;
      });
      this.get("get_all_filter_keys").then(function (data) {
        that.filterKeys = data;
      });
    },

    getFilterValue: function (value) {
      return this.filterValues[value] || value;
    },

    getFilterValues: function (values) {
      var that = this;
      var res = {};
      _.each(values, function (value) {
        res[value] = that.getFilterValue(value);
      });
      return res;
    },

    getFilterKeys: function (keys) {
      var that = this;
      var res = {};
      _.each(keys, function (key) {
        res[key] = that.getFilterKey(key);
      });
      return res;
    },

    getIdentityMap: function (ids) {
      var res = {};
      _.each(ids, function (id) {
        res[id] = id;
      });
      return res;
    },

    getValueNames: function (type, values) {
      if (type == "shop_id") {
        return this.getShopNames(values);
      } else if (type == "cat_id") {
        return this.getCategoryNames(values);
      } else if (type == "brand_id") {
        return this.getBrandNames(values);
      } else if (type == "payment_method") {
        return this.getIdentityMap(values);
      } else if (type == "price") {
        return this.getIdentityMap(values);
      } else {
        return this.getFilterValues(values);
      }
    },

    getResultNames: function (type, ids) {
      if (type == 0) {
        return this.getOfferNames(ids);
      } else if (type == 1) {
        return this.getProductNames(ids);
      } else if (type == 2) {
        return this.getCategoryNames(ids);
      } else {
        return undefined;
      }
    },

    getResults: function (type, ids) {
      var dfd = $.Deferred();
      var res = {};

      if (type == 0) {
        this.getOffers(ids).then(function (offers) {
          _.each(offers, function (o) {
            res[o.offer_id] = o;
          });
          dfd.resolve(res);
        })
        .fail(function (e) {
          dfd.reject(e);
        });
      } else if (type == 1) {
        this.getProducts(ids).then(function (products) {
          _.each(products, function (p) {
            res[p.product_id] = p;
          });
          dfd.resolve(res);
        })
        .fail(function (e) {
          dfd.reject(e);
        });
      } else if (type == 2) {
        this.getCategories(ids).then(function (categories) {
          _.each(categories, function (c) {
            c.name = c.description;
            res[c.category_id] = c;
          });
          dfd.resolve(res);
        })
        .fail(function (e) {
          dfd.reject(e);
        });
      } else {
        _.each(ids, function (i) {
          res[i] = {};
        });
        dfd.resolve(res);
      }

      return dfd.promise();
    },

    getFilterKey: function (key) {
      return this.filterKeys[key] || key;
    },

    getCategories: function (ids) {
      return this.get("get_category", {id: ids.join(",")});
    },

    getBrands: function (ids) {
      return this.get("get_brand", {id: ids.join(",")});
    },

    getProducts: function (ids) {
      return this.get("get_product", {id: ids.join(",")});
    },

    getOffers: function (ids) {
      return this.get("get_offer", {id: ids.join(",")});
    },

    getShops: function (ids) {
      return this.get("get_shop", {id: ids.join(",")});
    },

    getBrandNames: function (ids) {
      var dfd = $.Deferred();

      this.getBrands(ids).then(function (data) {
        var res = {};
        _.each(data, function (obj) {
          res[obj.brand_id] = obj.name;
        });
        dfd.resolve(res);
      })
      .fail(function () {
        dfd.reject();
      });

      return dfd.promise();
    },

    getShopNames: function (ids) {
      var dfd = $.Deferred();

      this.getShops(ids).then(function (data) {
        var res = {};
        _.each(data, function (obj) {
          res[obj.shop_id] = obj.name;
        });
        dfd.resolve(res);
      })
      .fail(function () {
        dfd.reject();
      });

      return dfd.promise();
    },

    getCategoryNames: function (ids) {
      var dfd = $.Deferred();

      this.getCategories(ids).then(function (data) {
        var res = {};
        _.each(data, function (obj) {
          res[obj.category_id] = obj.description;
        });
          dfd.resolve(res);
      })
      .fail(function () {
        dfd.reject();
      });

      return dfd.promise();
    },

    getProductNames: function (ids) {
      var dfd = $.Deferred();

      this.getProducts(ids).then(function (data) {
        var res = {};
        _.each(data, function (obj) {
          res[obj.product_id] = obj.name;
        });
          dfd.resolve(res);
      })
      .fail(function () {
        dfd.reject();
      });

      return dfd.promise();
    },

    getOfferNames: function (ids) {
      var dfd = $.Deferred();

      this.getOffers(ids).then(function (data) {
        var res = {};
        _.each(data, function (obj) {
          res[obj.offer_id] = obj.name;
        });
        dfd.resolve(res);
      })
      .fail(function () {
        dfd.reject();
      });

      return dfd.promise();
    },

    get: function (endpoint, params) {
      return $.ajax(
      { url: "http://foobar/" + endpoint,
        data: params,
        dataType: 'json',
        password: '',
        username: '' });
    }
  });

  return new BilligerApi();
});