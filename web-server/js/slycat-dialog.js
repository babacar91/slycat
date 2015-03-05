define("slycat-dialog", ["slycat-server-root", "slycat-web-client", "knockout", "knockout-mapping", "jquery"], function(server_root, client, ko, mapping, $)
{
  var module = {};

  module.dialog = function(params)
  {
    require(["text!" + server_root + "templates/slycat-alert.html"], function(template)
    {
      var component = {};
      component.close = function(button)
      {
        component.result = button;
        component.container.children().modal("hide");
      }
      component.title = ko.observable(params.title || "Alert");
      component.message = ko.observable(params.message || "");
      component.buttons = params.buttons || [{className: "btn-default", label:"OK"}];
      component.container = $($.parseHTML(template)).appendTo($("body"));
      component.container.children().on("hidden.bs.modal", function()
      {
        component.container.remove();
        if(params.callback)
          params.callback(component.result);
      });
      ko.applyBindings(component, component.container.get(0));
      component.container.children().modal("show");
    });
  }

  module.confirm = function(params)
  {
    module.dialog(
    {
      title: params.title || "Confirm",
      message: params.message || "",
      buttons: [{className: "btn-default", label: "OK"}, {className: "btn-default", label: "Cancel"}],
      callback: function(button)
      {
        if(button.label == "OK")
        {
          if(params.ok)
            params.ok();
        }
        else
        {
          if(params.cancel)
            params.cancel();
        }
      }
    });
  }

  module.ajax_error = function(message)
  {
    return function(request, status, reason_phrase)
    {
      module.dialog(
      {
        message: message + " " + reason_phrase
      });
    }
  }

  return module;
});

