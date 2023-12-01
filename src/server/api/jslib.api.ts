import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { untab } from "@zouloux/ecma-core";

const renderJSLib = props => untab(`
(function () {
	var base = "${props.base}/api/1.0/"
	var fetchOptions = { credentials: "include" }
	window.TenbeoLogin = {
		create: function ( options ) {
			var timeoutDuration = options.timeoutDuration ? options.timeoutDuration : 1000
			var timeout
			var image
			function track () {
				fetch(base + "auth/track/" + options.appSlug, fetchOptions).then( r => r.json() ).then( r => {
					if ( r.session && r.session.status === "VALIDATED" ) {
						options.onValidated( r.user )
						image && image.remove()
					} 
					else
						timeout = setTimeout(track, timeoutDuration)
				})
			}
			fetch(base + "auth/create/" + options.appSlug, fetchOptions).then( r => r.json() ).then( r => {
				if ( r.session && r.session.status === "VALIDATED" )
					options.onValidated( r.user )
				else if ( r.session && r.session.status === "PENDING" )
					timeout = setTimeout(track, timeoutDuration)				
				if ( r.login && r.login.qr ) {
					var qrData = r.login.qr
					if ( options.qrSelector ) {
						image = document.createElement("img")
						image.setAttribute("src", qrData )
						document.querySelector( options.qrSelector ).append( image )
					}
					if ( options.onQrCode )
						options.onQrCode( qrData )
				}
			})
		},
		logout: function ( appSlug, loggedOut ) {
			var o = Object.assign(fetchOptions, { method: "POST" })
			fetch(base + "auth/logout/" + appSlug, o).then( r => r.json() ).then( r => {
				loggedOut && loggedOut( r )
			})
		}
	}
})()
`)

const renderTestHTML = props => untab(`
<html>
	<head>
		<script src="${ props.js }"></script>
	</head>
	<body>
		<div id="TenbeoQR"></div>
	</body>
	<script>
		TenbeoLogin.create({
			appSlug: 'test',
			qrSelector: "#TenbeoQR",
			onQrCode: function ( qrData ) {
				const image = document.createElement("img")
				image.setAttribute("src", qrData)
				document.body.append( image )
			},
			onValidated: function ( user ) {
				console.log( user )
			}
		})
	</script>
</html>
`)


export function attachJSLibAPI ( base:string, server:FastifyInstance ) {
	server.get(`${base}/tenbeo-login.js`, (request:FastifyRequest, reply:FastifyReply) => {
		reply.type("text/javascript").send(
			renderJSLib({
				base: process.env.TENBEO_AUTH_PINGBACK_URL
			})
		)
	})
	// server.get(`${base}/tenbeo-login.html`, (request:FastifyRequest, reply:FastifyReply) => {
	// 	reply.type("text/html").send(
	// 		renderTestHTML({
	// 			js: `${base}/tenbeo-login.js`
	// 		})
	// 	)
	// })
}

