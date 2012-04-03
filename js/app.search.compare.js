define(["vendor/jsondiffpatch", "vendor/jsondiffpatch.html", "vendor/diff_match_patch_uncompressed", "app.search.models"],
function (jsondiffpatch, jsonDiffHtml, diff_match_patch, models) {
  jsondiffpatch.config.diff_match_path = diff_match_patch;
  jsondiffpatch.config.textDiffMinLength = 5;

  var SearchCompare = Backbone.Model.extend({
    defaults: {
      diff: undefined,
      diffHtml: undefined,
      d1: undefined,
      d2: undefined
    },

    initialize: function (options) {
    },

    compare: function (query, s1, s2) {
      var that = this;
      var q1 = query.clone();
      var q2 = query.clone();
      q1.set({searcherUrl: s1});
      q2.set({searcherUrl: s2});

      this.set({
        s1: s1 + '?' + q1.paramString(),
        s2: s2 + '?' + q2.paramString(),
        q1: q1.toJSON(),
        q2: q2.toJSON()},
      {silent: true});

      this.trigger("compare:start", q1, q2);
      query.trigger("search:start", query);

      var dfd = jQuery.Deferred();

      $.when(q1.search(), q2.search())
      .then(function (d1, d2) {
        var d = jsondiffpatch.diff(d1, d2);
        var html = "";
        if (d !== undefined) {
          html = jsonDiffHtml.diffToHtml(d1, d2, d);
        }

        that.set({diff: d,
          diffHtml: $(html).html(),
          d1: d1,
          d2: d2
        });
        console.log("diff");
        console.log(that.toJSON());
        query.trigger("search:success", d1, query);
        that.trigger("compare:success", d, q1, q2, d1, d2);
        dfd.resolve(d, q1, q2, d1, d2);
      })
      .fail(function (e1, e2) {
        query.trigger("search:error", e1[0] + e2[0], query);
        that.trigger("compare:error", q1, q2, e1[0], e2[0]);
        dfd.reject(q1, q2, e1[0], e2[0]);
      })
      .always(function () {
        query.trigger("search:finish", query);
        that.trigger("compare:finish", q1, q2);
      });

      return dfd.promise();
    }
  });

  return SearchCompare;
});