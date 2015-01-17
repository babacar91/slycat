def register_slycat_plugin(context):
  import os

  context.register_wizard("remote-cca", "Remote CCA Model", require={"context":"create", "project":True})
  context.register_wizard_resource("remote-cca", "ui.js", os.path.join(os.path.dirname(__file__), "remote-ui.js"))
  context.register_wizard_resource("remote-cca", "ui.html", os.path.join(os.path.dirname(__file__), "remote-ui.html"))

  context.register_wizard("local-cca", "Local CCA Model", require={"context":"create", "project":True})
  context.register_wizard_resource("local-cca", "ui.js", os.path.join(os.path.dirname(__file__), "local-ui.js"))
  context.register_wizard_resource("local-cca", "ui.html", os.path.join(os.path.dirname(__file__), "local-ui.html"))

  context.register_wizard("rerun-cca", "Rerun CCA Model", require={"context":"create", "project":True, "model":["cca"]})
  context.register_wizard_resource("rerun-cca", "ui.js", os.path.join(os.path.dirname(__file__), "rerun-ui.js"))
  context.register_wizard_resource("rerun-cca", "ui.html", os.path.join(os.path.dirname(__file__), "rerun-ui.html"))
