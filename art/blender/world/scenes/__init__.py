"""Backdrop scenes per age (PLAN 2b): `scenes/<age>.py` exports `SCENES = {"classic": Scene(...), ...}`."""
import importlib

import bpy  # noqa: F401  (bmesh, used by the geometry helpers, needs bpy imported first)

AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]


def load(age):
    """The age's scenes ({} when the age has no module yet)."""
    try:
        return importlib.import_module(f"world.scenes.{age}").SCENES
    except ModuleNotFoundError as e:
        if e.name != f"world.scenes.{age}":
            raise
        return {}
