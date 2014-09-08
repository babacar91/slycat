$(document).ready(function()
{
console.log("SEtup globals");
  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup global variables.
  //////////////////////////////////////////////////////////////////////////////////////////

  var model = null;
  var input_columns = null;
  var output_columns = null;
  var image_columns = null;
  var rating_columns = null;
  var category_columns = null;

  var bookmarker = new bookmark_manager("{{server-root}}", "{{#full-project}}{{_id}}{{/full-project}}", "{{_id}}");
  var bookmark = null;

  var table_metadata = null;
  var table_statistics = null;
  var indices = null;
  var x_index = null;
  var y_index = null;
  var v_index = null;
  var images_index = null;
  var x = null;
  var y = null;
  var v = null;
  var images = null;
  var selected_simulations = null;
  var hidden_simulations = null;

  var table_ready = false;
  var scatterplot_ready = false;
  var controls_ready = false;

  var session_cache = {};
  var image_uri = document.createElement("a");

  //////////////////////////////////////////////////////////////////////////////////////////
  // Load the model
  //////////////////////////////////////////////////////////////////////////////////////////
console.log("LOAD THE MODEL 1 -- ajax");
  $.ajax(
  {
    type : "GET",
    url : "{{server-root}}models/{{_id}}",
    success : function(result)
    {
      model = result;
      input_columns = model["artifact:input-columns"];
      output_columns = model["artifact:output-columns"];
      image_columns = model["artifact:image-columns"];
      rating_columns = model["artifact:rating-columns"] == undefined ? [] : model["artifact:rating-columns"];
      category_columns = model["artifact:category-columns"] == undefined ? [] : model["artifact:category-columns"];
      model_loaded();
    },
    error: function(request, status, reason_phrase)
    {
      window.alert("Error retrieving model: " + reason_phrase);
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Once the model has been loaded, retrieve metadata / bookmarked state
  //////////////////////////////////////////////////////////////////////////////////////////

  function model_loaded()
console.log("Inside model_loaded()");
  {
    if(model["state"] == "waiting" || model["state"] == "running")
    {
      $("#status-messages").empty().html(
        "<div class='error-heading'>Oops, this model isn't ready yet.</div>" +
        "<div class='error-description'>We're probabably building it for you right now." +
        "Watch the status bar for progress information and more details.</div>");
      show_status_messages();
    }
    else if(model["state"] == "closed" && model["result"] === null)
    {
      $("#status-messages").empty().html(
        "<div class='error-heading'>Oops, it looks like this model was never completed.</div>" +
        "<div class='error-description'>Here's the last thing that was happening before it was closed:</div>" +
        "<pre>" + model["message"] + "</pre>");
      show_status_messages();
    }
    else if(model["result"] == "failed")
    {
      $("#status-messages").empty().html(
        "<div class='error-heading'>Oops, it looks like this model failed to build.</div>" +
        "<div class='error-description'>Here's what was happening when it ended:</div>" +
        "<pre>" + model["message"] + "</pre>");
      show_status_messages();
    }
    else
    {
      // Display progress as the load happens ...
      $(".load-status").text("Loading data.");

      // Mark this model as closed, so it doesn't show-up in the header anymore.
console.log("mark this model as closed -- ajax");
      $.ajax(
      {
        type : "PUT",
        url : "{{server-root}}models/{{_id}}",
        contentType : "application/json",
        data : $.toJSON({
          "state" : "closed"
        }),
        processData : false
      });

console.log("Inside model laoded - load table metadata 1 -- ajax");
      // Load data table metadata.
      $.ajax({
        url : "{{server-root}}models/{{_id}}/tables/data-table/arrays/0/metadata?index=Index",
        contentType : "application/json",
        success: function(metadata)
        {
          table_metadata = metadata;
          table_statistics = new Array(metadata["column-count"]);
          table_statistics[metadata["column-count"]-1] = {"max": metadata["row-count"]-1, "min": 0};
          load_table_statistics(d3.range(metadata["column-count"]-1), metadata_loaded);
        },
        error: artifact_missing
      });

      // Retrieve bookmarked state information ...
      bookmarker.get_state(function(state)
      {
        bookmark = state;
        setup_colorswitcher();
        metadata_loaded();
      });
    }
  }

  function show_status_messages()
  {
console.log("Inside show_status_messages()");
    $("#status-messages").dialog(
    {
      autoOpen: true,
      width: 500,
      height: 300,
      modal: false,
      buttons:
      {
        OK: function()
        {
          $("#status-messages").dialog("close");
        }
      }
    });
  }

  function artifact_missing()
  {
console.log("Inside artifact_missing()");
    $(".load-status").css("display", "none");

    $("#status-messages").empty().html(
      "<div class='error-heading'>Oops, there was a problem retrieving data from the model.</div>" +
      "<div class='error-description'>This probably means that there was a problem building the model. " +
      "Here's the last thing that was going on with it:</div>" +
      "<pre>" + model["message"] + "</pre>");

    show_status_messages();
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup page layout and forms.
  //////////////////////////////////////////////////////////////////////////////////////////

  // Setup the edit model form ...
  $("#edit-model-form").dialog(
  {
    autoOpen: false,
    width: 700,
    height: 300,
    modal: true,
    buttons:
    {
      "Save Changes": function()
      {
        var model =
        {
          "name" : $("#edit-model-name").val(),
          "description" : $("#edit-model-description").val()
        };

console.log("save model changes -- ajax");
        $.ajax(
        {
          type : "PUT",
          url : "{{server-root}}models/{{_id}}",
          contentType : "application/json",
          data : $.toJSON(model),
          processData : false,
          success : function()
          {
            window.location.reload();
          },
          error : function(request, status, reason_phrase)
          {
            window.alert("Error updating model: " + reason_phrase);
          }
        });
      },
      Cancel: function()
      {
        $(this).dialog("close");
      }
    },
    close: function()
    {
    }
  });

  $("#delete-model-link").click(function(){
    if(!window.confirm("Delete model {{name}}?  This cannot be undone."))
      return false;

console.log("delete model -- ajax");
    $.ajax(
    {
      type : "DELETE",
      url : "{{server-root}}models/{{_id}}",
      success : function(details)
      {
        window.location.href = "{{server-root}}projects/{{#full-project}}{{_id}}{{/full-project}}";
      },
      error : function(request, status, reason_phrase)
      {
        window.alert("Error deleting model: " + reason_phrase);
      }
    });
  });

  $("#edit-model-button").button().click(function()
  {
    $("#edit-model-form").dialog("open");
    $("#edit-model-name").focus();
  });


  // Layout resizable panels ...
  $("body").layout(
  {
    north:
    {
    },
    center:
    {
    },
    south:
    {
      size: $("body").height() / 2,
      resizeWhileDragging: false,
      onresize: function()
      {
        $("#table").css("height", $("#table-pane").height());
        $("#table").table("resize_canvas");
      }
    },
  });

  $("#model-pane").layout(
  {
    center:
    {
      resizeWhileDragging: false,
      onresize: function() { 
        $("#scatterplot").scatterplot("option", {
          width: $("#scatterplot-pane").width(), 
          height: $("#scatterplot-pane").height()
        }); 
      },
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  // Setup the rest of the UI as data is received.
  //////////////////////////////////////////////////////////////////////////////////////////

  function setup_colorswitcher()
  {
    var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

    $("#color-switcher").colorswitcher({colormap:colormap});
    $("#color-switcher").bind("colormap-changed", function(event, colormap)
    {
      selected_colormap_changed(colormap);
    });
  }

  function metadata_loaded()
  {
    setup_table();

    if(!indices && table_metadata)
    {
      var count = table_metadata["row-count"];
      indices = new Int32Array(count);
      for(var i = 0; i != count; ++i)
        indices[i] = i;
    }

    if(table_metadata && bookmark)
    {
      // Choose some columns for the X and Y axes.
      var numeric_variables = [];
      for(var i = 0; i < table_metadata["column-count"]-1; i++)
      {
        // Only use non-string columns that are not used for ratings or categories
        if(table_metadata["column-types"][i] != 'string' && rating_columns.indexOf(i) == -1 && category_columns.indexOf(i) == -1)
          numeric_variables.push(i);
      }

      x_index = numeric_variables[0];
      y_index = numeric_variables[1 % numeric_variables.length];
      if("x-selection" in bookmark)
        x_index = Number(bookmark["x-selection"]);
      if("y-selection" in bookmark)
        y_index = Number(bookmark["y-selection"]);

      // Set state of selected and hidden simulations
      selected_simulations = [];
      if("simulation-selection" in bookmark)
        selected_simulations = bookmark["simulation-selection"];
      hidden_simulations = [];
      if("hidden-simulations" in bookmark)
        hidden_simulations = bookmark["hidden-simulations"];

      get_model_array_attribute({
        server_root : "{{server-root}}",
        mid : "{{_id}}",
        aid : "data-table",
        array : 0,
        attribute : x_index,
        success : function(result)
        {
          x = result;
          setup_scatterplot();
          setup_table();
        },
        error : artifact_missing
      });

      get_model_array_attribute({
        server_root : "{{server-root}}",
        mid : "{{_id}}",
        aid : "data-table",
        array : 0,
        attribute : y_index,
        success : function(result)
        {
          y = result;
          setup_scatterplot();
          setup_table();
        },
        error : artifact_missing
      });

      v_index = table_metadata["column-count"] - 1;
      if("variable-selection" in bookmark)
        v_index = Number(bookmark["variable-selection"]);

      if(v_index == table_metadata["column-count"] - 1)
      {
        var count = table_metadata["row-count"];
        v = new Float64Array(count);
        for(var i = 0; i != count; ++i)
          v[i] = i;
        setup_scatterplot();
      }
      else
      {
        get_model_array_attribute({
          server_root : "{{server-root}}",
          mid : "{{_id}}",
          aid : "data-table",
          array : 0,
          attribute : v_index,
          success : function(result)
          {
            v = result;
            setup_scatterplot();
          },
          error : artifact_missing
        });
      }

      images_index = image_columns[0];
      if("images-selection" in bookmark)
        images_index = bookmark["images-selection"];

console.log("GET models/id/arraysets/data-table/arrays/0/attrs -- ajax");
      $.ajax(
      {
        type : "GET",
        url : "{{server-root}}models/{{_id}}/arraysets/data-table/arrays/0/attributes/" 
          + images_index + "/chunk?ranges=0," + table_metadata["row-count"],
        success : function(result)
        {
          images = result;
          setup_scatterplot();
          setup_table();
        },
        error: artifact_missing
      });
      setup_controls();
    }
  }

  function setup_table()
  {
    if( !table_ready && table_metadata && (table_statistics.length == table_metadata["column-count"]) 
      && bookmark && (x_index != null) && (y_index != null) && (images_index != null) 
      && (selected_simulations != null) && (hidden_simulations != null) )
    {
      table_ready = true;

      $("#table-pane .load-status").css("display", "none");

      var other_columns = [];
      for(var i = 0; i != table_metadata["column-count"] - 1; ++i)
      {
        if($.inArray(i, input_columns) == -1 && $.inArray(i, output_columns) == -1 
          && $.inArray(i, rating_columns) == -1 && $.inArray(i, category_columns) == -1)
          other_columns.push(i);
      }

      var table_options =
      {
        "server-root" : "{{server-root}}",
        mid : "{{_id}}",
        aid : "data-table",
        metadata : table_metadata,
        statistics : table_statistics,
        inputs : input_columns,
        outputs : output_columns,
        others : other_columns,
        images : image_columns,
        ratings : rating_columns,
        categories : category_columns,
        "image-variable" : images_index,
        "x-variable" : x_index,
        "y-variable" : y_index,
        "row-selection" : selected_simulations,
        hidden_simulations : hidden_simulations,
      };

      var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";
      table_options.colormap = $("#color-switcher").colorswitcher("get_color_map", colormap);

      if("sort-variable" in bookmark && "sort-order" in bookmark)
      {
        table_options["sort-variable"] = bookmark["sort-variable"];
        table_options["sort-order"] = bookmark["sort-order"];
      }

      if("variable-selection" in bookmark)
      {
        table_options["variable-selection"] = [bookmark["variable-selection"]];
      }
      else
      {
        table_options["variable-selection"] = [table_metadata["column-count"] - 1];
      }

      $("#table").table(table_options);

      // Log changes to the table sort order ...
      $("#table").bind("variable-sort-changed", function(event, variable, order)
      {
        variable_sort_changed(variable, order);
      });

      // Log changes to the x variable ...
      $("#table").bind("x-selection-changed", function(event, variable)
      {
        x_selection_changed(variable);
      });

      // Log changes to the y variable ...
      $("#table").bind("y-selection-changed", function(event, variable)
      {
        y_selection_changed(variable);
      });

      // Log changes to the images variable ...
      $("#table").bind("images-selection-changed", function(event, variable)
      {
        images_selection_changed(variable);
      });

      // Log changes to the table variable selection ...
      $("#table").bind("variable-selection-changed", function(event, selection)
      {
        selected_variable_changed(selection[0]);
      });

      // Log changes to the table row selection ...
      $("#table").bind("row-selection-changed", function(event, selection)
      {
        // The table selection is an array buffer which can't be
        // serialized as JSON, so convert it to an array.
        var temp = [];
        for(var i = 0; i != selection.length; ++i)
          temp.push(selection[i]);
        selected_simulations_changed(temp);
      });

      // Changing the colormap updates the table ...
      $("#color-switcher").bind("colormap-changed", function(event, colormap)
      {
        $("#table").table("option", "colormap", $("#color-switcher").colorswitcher("get_color_map", colormap));
      });

      // Changing the table variable updates the scatterplot ...
      $("#table").bind("variable-selection-changed", function(event, selection)
      {
        update_scatterplot_value(selection[0]);
      });

      // Changing the scatterplot selection updates the table row selection and controls ..
      $("#scatterplot").bind("selection-changed", function(event, selection)
      {
        $("#table").table("option", "row-selection", selection);
        $("#controls").controls("option", "selection", selection);
      });

      // Changing the table row selection updates the scatterplot and controls ...
      $("#table").bind("row-selection-changed", function(event, selection)
      {
        // The table selection is an array buffer, so convert it to an array.
        var temp = [];
        for(var i = 0; i != selection.length; ++i)
          temp.push(selection[i]);

        $("#scatterplot").scatterplot("option", "selection",  temp);
        $("#controls").controls("option", "selection",  temp);
      });

      // Changing the x variable updates the table ...
      $("#controls").bind("x-selection-changed", function(event, variable)
      {
        $("#table").table("option", "x-variable", variable);
      });

      // Changing the y variable updates the table ...
      $("#controls").bind("y-selection-changed", function(event, variable)
      {
        $("#table").table("option", "y-variable", variable);
      });

      // Changing the image variable updates the table ...
      $("#controls").bind("images-selection-changed", function(event, variable)
      {
        $("#table").table("option", "image-variable", variable);
      });

      // Changing the color variable updates the table ...
      $("#controls").bind("color-selection-changed", function(event, variable)
      {
        $("#table").table("option", "variable-selection", [Number(variable)]);
      });
    }
  }

  function setup_scatterplot()
  {
    // Setup the scatterplot ...
    if(!scatterplot_ready && bookmark && indices && x && y && v && images 
      && (selected_simulations != null) && (hidden_simulations != null))
    {
      scatterplot_ready = true;

      $("#scatterplot-pane .load-status").css("display", "none");

      var colormap = bookmark["colormap"] !== undefined ? bookmark["colormap"] : "night";

      $("#scatterplot-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());

      var open_images = [];
      if("open-images-selection" in bookmark)
        open_images = bookmark["open-images-selection"];

      $("#scatterplot").scatterplot({
        indices: indices,
        x_label: table_metadata["column-names"][x_index],
        y_label: table_metadata["column-names"][y_index],
        v_label: table_metadata["column-names"][v_index],
        x: x,
        y: y,
        v: v,
        images: images,
        width: $("#scatterplot-pane").width(),
        height: $("#scatterplot-pane").height(),
        color: $("#color-switcher").colorswitcher("get_color_map", colormap),
        selection: selected_simulations,
        server_root: "{{server-root}}",
        open_images: open_images,
        gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
        hidden_simulations: hidden_simulations,
        });

      $("#scatterplot").bind("selection-changed", function(event, selection)
      {
        selected_simulations_changed(selection);
      });

      // Changing the color map updates the scatterplot ...
      $("#color-switcher").bind("colormap-changed", function(event, colormap)
      {
        $("#scatterplot-pane").css("background", $("#color-switcher").colorswitcher("get_background", colormap).toString());
        $("#scatterplot").scatterplot("option", {
          color:    $("#color-switcher").colorswitcher("get_color_map", colormap),
          gradient: $("#color-switcher").colorswitcher("get_gradient_data", colormap),
        });
      });

      // Changing the x variable updates the scatterplot ...
      $("#table").bind("x-selection-changed", function(event, variable)
      {
        update_scatterplot_x(variable);
      });
      $("#controls").bind("x-selection-changed", function(event, variable)
      {
        update_scatterplot_x(variable);
      });

      // Changing the y variable updates the scatterplot ...
      $("#table").bind("y-selection-changed", function(event, variable)
      {
        update_scatterplot_y(variable);
      });
      $("#controls").bind("y-selection-changed", function(event, variable)
      {
        update_scatterplot_y(variable);
      });

      // Changing the images variable updates the scatterplot ...
      $("#table").bind("images-selection-changed", function(event, variable)
      {
console.log("changing the images var updates the scatter plot -- ajax");
        $.ajax(
        {
          type : "GET",
          url : "{{server-root}}models/{{_id}}/arraysets/data-table/arrays/0/attributes/" + 
            variable + "/chunk?ranges=0," + table_metadata["row-count"],
          success : function(result)
          {
            $("#scatterplot").scatterplot("option", "images", result);
          },
          error: artifact_missing
        });
      });
      $("#controls").bind("images-selection-changed", function(event, variable)
      {
console.log("GET  -- ajax");
        $.ajax(
        {
          type : "GET",
          url : "{{server-root}}models/{{_id}}/arraysets/data-table/arrays/0/attributes/" + 
            variable + "/chunk?ranges=0," + table_metadata["row-count"],
          success : function(result)
          {
            $("#scatterplot").scatterplot("option", "images", result);
          },
          error: artifact_missing
        });
      });

      // Log changes to open images ...
      $("#scatterplot").bind("open-images-changed", function(event, selection)
      {
        open_images_changed(selection);
      });
    }
  }

  function setup_controls()
  {
    if( !controls_ready && table_metadata && (image_columns != null) && (rating_columns != null) 
      && (category_columns != null) && (x_index != null) && (y_index != null) 
      && (images_index != null) && (selected_simulations != null) )
    {
      controls_ready = true;
      var numeric_variables = [];

      for(var i = 0; i < table_metadata["column-count"]; i++)
      {
        if(table_metadata["column-types"][i] != 'string')
          numeric_variables.push(i);
      }

      var color_variable = table_metadata["column-count"] - 1;
      if("variable-selection" in bookmark)
      {
        color_variable = [bookmark["variable-selection"]];
      }

      $("#controls").controls({
        "server-root" : "{{server-root}}",
        mid : "{{_id}}",
        model_name: "{{name}}",
        aid : "data-table",
        metadata: table_metadata,
        x_variables: numeric_variables.slice(0, numeric_variables.length-1),
        y_variables: numeric_variables.slice(0, numeric_variables.length-1),
        image_variables: image_columns,
        color_variables: [numeric_variables[numeric_variables.length-1]].concat(numeric_variables.slice(0, numeric_variables.length-1)),
        rating_variables : rating_columns,
        category_variables : category_columns,
        selection : selected_simulations,
        "x-variable" : x_index,
        "y-variable" : y_index,
        "image-variable" : images_index,
        "color-variable" : color_variable,
      });

      // Changing the x variable updates the controls ...
      $("#table").bind("x-selection-changed", function(event, variable)
      {
        $("#controls").controls("option", "x-variable", variable);
      });

      // Changing the y variable updates the controls ...
      $("#table").bind("y-selection-changed", function(event, variable)
      {
        $("#controls").controls("option", "y-variable", variable);
      });

      // Changing the image variable updates the controls ...
      $("#table").bind("images-selection-changed", function(event, variable)
      {
        $("#controls").controls("option", "image-variable", variable);
      });

      // Changing the table variable updates the controls ...
      $("#table").bind("variable-selection-changed", function(event, selection)
      {
        $("#controls").controls("option", "color-variable", selection[0]);
      });

      // Changing the table variable updates the legend label ...
      $("#table").bind("variable-selection-changed", function(event, selection)
      {
        $("#scatterplot").scatterplot("option", {v_label:table_metadata["column-names"][selection[0]]});
      });

      // Changing the color variable updates the scatterplot ...
      $("#controls").bind("color-selection-changed", function(event, variable)
      {
        update_scatterplot_value(variable);
      });

      // Changing the color variable updates the legend label ...
      $("#controls").bind("color-selection-changed", function(event, variable)
      {
        $("#scatterplot").scatterplot("option", {v_label:table_metadata["column-names"][variable]});
      });

      // Changing the value of a variable updates the database, table, and scatterplot ...
      $("#controls").bind("set-value", function(event, arguments)
      {
        //console.log("set-value. selection: " + selection + ", variable: " + variable + ", value: " + value);
        var selection = arguments.selection;
        var variable = arguments.variable;
        var myBlob = new Blob(['[' + arguments.value + ']'], {type: "text/html"});

        var hyperslice = "";
        writeData(selection, variable, myBlob, 0);

        function writeData(selection, variable, blob, iterator){
          hyperslice = selection[iterator] + ":" + (selection[iterator]+1);
          var formdata = new FormData();
          // formdata.append("array", 0);
          // formdata.append("attribute", variable);
          // formdata.append("hyperslice", hyperslice);
          formdata.append("hyperchunks", 0 + "/" + variable + "/" + hyperslice);
          formdata.append("data", blob);
          $.ajax({
            type: "PUT",
            url : "{{server-root}}models/{{_id}}/arraysets/data-table/data",
            data : formdata,
            processData: false,
            contentType: false,
            success : function(results)
            {
              console.log("writing array data SUCCESS");
              iterator++;
              if(iterator<selection.length) {
                writeData(selection, variable, blob, iterator);
              } 
              else {
                // Finished writing data, need to update widgets
                // Load data table metadata.
                // $.ajax({
                //   url : "{{server-root}}models/{{_id}}/tables/data-table/arrays/0/metadata?index=Index",
                //   contentType : "application/json",
                //   success: function(metadata)
                //   {
                //     table_metadata = metadata;
                //     $("#table").table("option", "metadata", metadata);
                //   },
                //   error: artifact_missing
                // });

                $("#table").table("update_data");

                if(variable == x_index)
                  update_scatterplot_x(variable);
                if(variable == y_index)
                  update_scatterplot_y(variable);
                if(variable == v_index)
                  update_scatterplot_value(variable);

                load_table_statistics([variable], function(){
                  $("#table").table("option", "statistics", table_statistics);
                });
              }

            },
            error : function(jqXHR, textStatus, errorThrown)
            {
              console.log("writing array data error");
            },
          });
        }

      });

      // Log changes to the x variable ...
      $("#controls").bind("x-selection-changed", function(event, variable)
      {
        x_selection_changed(variable);
      });

      // Log changes to the y variable ...
      $("#controls").bind("y-selection-changed", function(event, variable)
      {
        y_selection_changed(variable);
      });

      // Log changes to the images variable ...
      $("#controls").bind("images-selection-changed", function(event, variable)
      {
        images_selection_changed(variable);
      });

      // Log changes to the color variable ...
      $("#controls").bind("color-selection-changed", function(event, variable)
      {
        selected_variable_changed(Number(variable));
      });

      // Log changes to hidden selection ...
      $("#controls").bind("hide-selection", function(event, selection)
      {
        for(var i=0; i<selected_simulations.length; i++){
          if($.inArray(selected_simulations[i], hidden_simulations) == -1) {
            hidden_simulations.push(selected_simulations[i]);
          }
        }
        hidden_simulations_changed();
        $("#table").table("option", "hidden_simulations", hidden_simulations);
        $("#scatterplot").scatterplot("option", "hidden_simulations", hidden_simulations);
      });

      // Log changes to hidden selection ...
      $("#controls").bind("show-selection", function(event, selection)
      {
        for(var i=0; i<selected_simulations.length; i++){
          var index = $.inArray(selected_simulations[i], hidden_simulations);
          if(index != -1) {
            hidden_simulations.splice(index, 1);
          }
        }
        hidden_simulations_changed();
        $("#table").table("option", "hidden_simulations", hidden_simulations);
        $("#scatterplot").scatterplot("option", "hidden_simulations", hidden_simulations);
      });
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  // Event handlers.
  //////////////////////////////////////////////////////////////////////////////////////////

  function selected_colormap_changed(colormap)
  {
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/colormap/" + colormap
    });
    bookmarker.updateState({"colormap" : colormap});
  }

  function selected_variable_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/variable/" + variable
    });
    bookmarker.updateState({"variable-selection" : variable});
    v_index = Number(variable);
  }

  function variable_sort_changed(variable, order)
  {
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/sort-order/" + variable + "/" + order
    });
    bookmarker.updateState( {"sort-variable" : variable, "sort-order" : order} );
  }

  function selected_simulations_changed(selection)
  {
    // Logging every selected item is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/simulation/count/" + selection.length
    });
    bookmarker.updateState( {"simulation-selection" : selection} );
    selected_simulations = selection;
  }

  function x_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/x/" + variable
    });
    bookmarker.updateState( {"x-selection" : variable} );
    x_index = Number(variable);
  }

  function y_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/y/" + variable
    });
    bookmarker.updateState( {"y-selection" : variable} );
  }

  function images_selection_changed(variable)
  {
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/images/" + variable
    });
    bookmarker.updateState( {"images-selection" : variable} );
    y_index = Number(variable);
  }

  function open_images_changed(selection)
  {
    // Logging every open image is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/select/openimages/count/" + selection.length
    });
    bookmarker.updateState( {"open-images-selection" : selection} );
  }

  function hidden_simulations_changed()
  {
    // Logging every hidden simulation is too slow, so just log the count instead.
    $.ajax(
    {
      type : "POST",
      url : "{{server-root}}events/models/{{_id}}/hidden/count/" + hidden_simulations.length
    });
    bookmarker.updateState( {"hidden-simulations" : hidden_simulations} );
  }

  function update_scatterplot_value(attribute)
  {
    if(attribute == table_metadata["column-count"] - 1)
    {
      var count = v.length;
      for(var i = 0; i != count; ++i)
        v[i] = i;
      $("#scatterplot").scatterplot("option", {v : v});
    }
    else
    {
      get_model_array_attribute({
        server_root : "{{server-root}}",
        mid : "{{_id}}",
        aid : "data-table",
        array : 0,
        attribute : attribute,
        success : function(result)
        {
          v = result;
          $("#scatterplot").scatterplot("option", {v : v});
        },
        error : artifact_missing
      });
    }
  }

  function update_scatterplot_x(variable)
  {
    get_model_array_attribute({
      server_root : "{{server-root}}",
      mid : "{{_id}}",
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        $("#scatterplot").scatterplot("option", {x: result, x_label:table_metadata["column-names"][variable]});
      },
      error : artifact_missing
    });
  }

  function update_scatterplot_y(variable)
  {
    get_model_array_attribute({
      server_root : "{{server-root}}",
      mid : "{{_id}}",
      aid : "data-table",
      array : 0,
      attribute : variable,
      success : function(result)
      {
        $("#scatterplot").scatterplot("option", {y: result, y_label:table_metadata["column-names"][variable]});
      },
      error : artifact_missing
    });
  }

  function display_image(uri)
  {
    image_uri.href = uri.substr(0, 5) == "file:" ? uri.substr(5) : uri;
    if(image_uri.hostname in session_cache)
      load_image();
    else
      $("#remote-login").dialog("open");
  }

  function load_image()
  {
    var sid = session_cache[image_uri.hostname];
    image = document.createElement("img");
    image.src = "{{server-root}}remote/" + sid + "/file" + image_uri.pathname;
    image.width = 100;
    image.style.position="absolute";
    image.style.left=10;
    image.style.top=10;
    $("#scatterplot-pane").prepend(image);
  }

  function load_table_statistics(columns, callback)
  {
    var requests = Array();
    for(var i=0; i<columns.length; i++)
    {
      requests.push(
        $.ajax({
          url : "{{server-root}}models/{{_id}}/arraysets/data-table/arrays/0/attributes/" + columns[i] + "/statistics",
          contentType : "application/json",
        })
      );
    }
    var defer = $.when.apply($, requests);
    defer.done(function(){
      // This is executed only after every ajax request has been completed
      $.each(arguments, function(index, responseData){
        // "responseData" contains an array of response information for each specific request
        table_statistics[parseInt(columns[index])] = responseData.length == undefined ? responseData : responseData[0];
      });
      callback();
    });
  }
});