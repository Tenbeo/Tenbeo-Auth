

export function jsonBodyBuilder ( handler:(args) => object, method:string ) {
	return function ( request:RequestInit, fetcherArguments ) {
		request.method = method
		request.headers = new Headers({
			'Content-Type': 'application/json',
		})
		return JSON.stringify( handler ? handler( fetcherArguments ) : {} )
	}
}