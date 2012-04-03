Backbone.ModelBinding.Conventions.bootstrapButtons = {
  selector: "a.btn",
  handler: {
    bind: function (selector, view, model, config) {
      var modelBinder = this;

      view.$(selector).each(function (index) {
        var elt = view.$(this);
        var attribute_name = $(elt).attr("name");

        var modelChange = function (model, val) {
          if (val) {
            elt.addClass("active");
          } else {
            elt.removeClass("active");
          }
        };

        var setModelValue = function (attr, value) {
          var data = {};
          data[attr] = value;
          model.set(data);
        };

        var elementChange = function (ev) {
          var changedElement = view.$(ev.target);
          var active = changedElement.hasClass("active") ? true : false;
          setModelValue(attribute_name, active);
        }

        modelBinder.registerModelBinding(model, attribute_name, modelChange);
        elt.bind("toggle", elementChange);
        modelBinder.elementBindings.push({element: elt, eventName: "toggle", callback: elementChange});

        modelChange(model, model.get(attribute_name));
      });
    }
  }
};

Backbone.Events.bindAll = Backbone.Model.prototype.bindAll = function (callbacks, context) {
  var that = this;
  _.each(callbacks, function (callback, event) {
    that.on(event, callback, context);
  });
};

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

var slice = Array.prototype.slice;

Backbone.Marionette.BindTo.proxy = function (src) {
  var events = slice.call(arguments, 1);

  var that = this;
  _.each(events, function (evt) {
    src.bind(evt, function () {
      var args = slice.call(arguments);
      args.unshift(evt);
      that.trigger.apply(that, args);
    });
  });

  return this;
};

/**
 * @class HandleBarsView
 * @extends Backbone.Marionette.ItemView
 */
var HandlebarsView = Backbone.Marionette.ItemView.extend(/** @lends HandlebarsView */
{
  constructor: function (options) {
    options = options || {};
    this.app = options.app;
    Backbone.Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

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
      type:     null
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
    this.createAlert(message).then(function (elt) {
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

