from twisted.application.service import ServiceMaker

octopus_editor = ServiceMaker(
    name = 'octopus-editor', 
	module = 'server.tap', 
	description = 'Run the octopus editor service.', 
	tapname = 'octopus-editor'
)
