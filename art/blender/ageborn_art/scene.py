"""Scene, render settings and the orthographic sprite camera."""
import math

import bpy
from mathutils import Vector

from . import config as C
from . import materials


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    materials.reset()
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    cy = scene.cycles
    cy.device = "CPU"
    cy.samples = C.SAMPLES
    cy.use_adaptive_sampling = False
    cy.use_denoising = False  # emission-only shading has no noise to remove
    cy.max_bounces = 0
    cy.diffuse_bounces = 0
    cy.glossy_bounces = 0
    cy.transmission_bounces = 0
    cy.volume_bounces = 0
    cy.transparent_max_bounces = 16  # outline hulls are see-through on their near side
    cy.pixel_filter_type = "BLACKMAN_HARRIS"
    cy.filter_width = 1.5
    scene.render.film_transparent = True
    scene.render.threads_mode = "FIXED"
    scene.render.threads = C.THREADS
    scene.render.use_persistent_data = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    scene.world = world
    return scene


def camera(width_px, height_px, feet_px):
    """Orthographic camera at PX_PER_LU so the character origin (feet) lands on pixel
    `feet_px` = (x from left, y from top). Returns the camera object."""
    scene = bpy.context.scene
    scene.render.resolution_x = width_px
    scene.render.resolution_y = height_px
    cam_data = bpy.data.cameras.new("sprite_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(width_px, height_px) / C.PX_PER_LU
    cam_data.clip_start = 1.0
    cam_data.clip_end = 5000.0
    cam = bpy.data.objects.new("sprite_cam", cam_data)
    scene.collection.objects.link(cam)
    e = math.radians(C.CAMERA_ELEVATION_DEG)
    forward = Vector((0.0, math.cos(e), -math.sin(e)))
    up = Vector((0.0, math.sin(e), math.cos(e)))
    right = Vector((1.0, 0.0, 0.0))
    fx, fy = feet_px
    # Screen-plane offset from the feet to the frame centre, in lu.
    centre = right * ((width_px / 2 - fx) / C.PX_PER_LU) + up * ((fy - height_px / 2) / C.PX_PER_LU)
    cam.location = centre - forward * 1000.0
    cam.rotation_euler = (math.pi / 2 - e, 0.0, 0.0)
    scene.camera = cam
    return cam
