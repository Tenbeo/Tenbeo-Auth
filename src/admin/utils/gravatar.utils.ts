
export const loadGravatarFromUserEmail = ( email:string, size = 128 ) => new Promise<HTMLImageElement>( async (resolve, reject) => {
	// Crypto not available on insecure domains
	if ( !crypto.subtle )
		return reject()
	// Convert e-mail address to a SHA-256
	const encoder = new TextEncoder();
	const data = encoder.encode( email );
	const hash = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hash));
	const hashString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
	// Create image tag and try to load gravatar
	const image = document.createElement("img")
	image.setAttribute("src", `https://gravatar.com/avatar/${hashString}.jpg?s=${size}&d=404`)
	image.setAttribute("class", "Avatar_image")
	// When loaded, replace placeholder with image
	image.onload = () => resolve( image )
	image.onerror = reject
})