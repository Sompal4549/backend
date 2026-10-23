import { Router } from 'express';
import {
  getGalleryMeta,
  saveGalleryMeta,
  getGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  updateGalleryItemStatus,
  deleteGalleryItem,
  bulkDeleteGalleryItems,
  reorderGalleryItems,
  getVideoHighlights,
  createVideoHighlight,
  updateVideoHighlight,
  updateVideoHighlightStatus,
  deleteVideoHighlight,
  bulkDeleteVideoHighlights,
  getTestimonialsCarousel,
  updateTestimonialsCarousel,
} from '../controllers/website-media.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

// Mounted at /website (so served on /api/website/... and /api/v1/website/...)
const router = Router();

// Gallery metadata (categories / years)
router.get('/gallery/meta', getGalleryMeta);
router.post('/gallery/meta', authMiddleware, adminMiddleware, saveGalleryMeta);

// Gallery items
router.get('/gallery/items', getGalleryItems);
router.post('/gallery/items', authMiddleware, adminMiddleware, createGalleryItem);
router.post('/gallery/items/bulk-delete', authMiddleware, adminMiddleware, bulkDeleteGalleryItems);
// Must stay above /gallery/items/:id, otherwise "reorder" is captured as an id
router.put('/gallery/items/reorder', authMiddleware, adminMiddleware, reorderGalleryItems);
router.put('/gallery/items/:id', authMiddleware, adminMiddleware, updateGalleryItem);
router.patch('/gallery/items/:id/status', authMiddleware, adminMiddleware, updateGalleryItemStatus);
router.delete('/gallery/items/:id', authMiddleware, adminMiddleware, deleteGalleryItem);

// Video highlights
router.get('/gallery/video-highlights/items', getVideoHighlights);
router.post('/gallery/video-highlights/items', authMiddleware, adminMiddleware, createVideoHighlight);
router.post('/gallery/video-highlights/items/bulk-delete', authMiddleware, adminMiddleware, bulkDeleteVideoHighlights);
router.put('/gallery/video-highlights/items/:id', authMiddleware, adminMiddleware, updateVideoHighlight);
router.patch('/gallery/video-highlights/items/:id/status', authMiddleware, adminMiddleware, updateVideoHighlightStatus);
router.delete('/gallery/video-highlights/items/:id', authMiddleware, adminMiddleware, deleteVideoHighlight);

// Home page testimonial videos (single document, full-list save)
router.get('/home/testimonials-carousel', getTestimonialsCarousel);
router.put('/home/testimonials-carousel', authMiddleware, adminMiddleware, updateTestimonialsCarousel);

export { router as websiteMediaRouter };
