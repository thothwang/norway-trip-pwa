/**
 * Compresses an image file to a WebP blob with a maximum dimension of 1200px.
 * @param {File} file - The original image file from the input/camera.
 * @returns {Promise<Blob>} - The compressed WebP image as a Blob.
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    // 1. Set our maximum dimension (Width or Height)
    const MAX_SIZE = 1200; 
    
    // 2. Read the file into memory
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 3. Calculate the new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round(height * (MAX_SIZE / width));
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round(width * (MAX_SIZE / height));
            height = MAX_SIZE;
          }
        }

        // 4. Create an invisible HTML5 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 5. Draw the resized image onto the canvas
        ctx.drawImage(img, 0, 0, width, height);

        // 6. Export the canvas as a WebP file at 80% quality (0.80)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas export failed.'));
            }
          },
          'image/webp', // The magical format that saves so much space!
          0.80          // The 80% quality sweet spot
        );
      };
      
      img.onerror = (error) => reject(error);
      img.src = event.target.result;
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};