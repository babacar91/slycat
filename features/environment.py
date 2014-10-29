import json
import nose
import os
import subprocess
import sys

source_root = os.path.dirname(os.path.dirname(__file__))
slycat_agent = os.path.join(source_root, "agent", "slycat-agent.py")
ffmpeg = "/usr/bin/ffmpeg"

def before_feature(context, feature):
  if feature.name == "slycat-agent":
    context.agent = subprocess.Popen([sys.executable, slycat_agent, "--ffmpeg=%s" % ffmpeg], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    nose.tools.assert_equal(json.loads(context.agent.stdout.readline()), {"message":"Ready."})
