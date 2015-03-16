import slycat.web.client
import time

parser = slycat.web.client.ArgumentParser()
parser.add_argument("--project-name", default="Project Cache Test", help="New project name.  Default: %(default)s")
arguments = parser.parse_args()

connection = slycat.web.client.connect(arguments)
pid = connection.find_or_create_project(arguments.project_name)
sid = connection.post_remotes("localhost", "slycat", "slycat")

#print connection.post_remote_browse(sid, "/home/slycat/src/slycat")
print connection.get_remote_file(sid, "/home/slycat/src/slycat/README.md", cache="project", project=pid, key="test")
print connection.get_project_cache_object(pid, "test")
print connection.get_remote_file(sid, "/home/slycat/src/slycat/README.md", cache="project", project=pid, key="test")
print connection.get_project_cache_object(pid, "test")

connection.delete_remote(sid)
