"""Build ResNet50 + Bohlol-specific FC head (Fig. 12)."""
from __future__ import annotations

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import ResNet50

HEAD_LAYER_NAMES = frozenset(
    {"gap", "fc_512", "dropout_fc", "fc_256", "fc_128", "fc_64", "fc_32", "batch_norm_head", "predictions"}
)


def safe_preprocess(x, **kwargs):
    return tf.keras.applications.resnet50.preprocess_input(x)


def build_resnet50_bohlol(
    num_classes: int = 10,
    input_shape: tuple[int, int, int] = (224, 224, 3),
    dropout_rate: float = 0.2,
) -> tf.keras.Model:
    """ResNet50 (ImageNet) + specific dense layers per Bohlol et al. 2025."""
    backbone = ResNet50(
        include_top=False,
        weights="imagenet",
        input_shape=input_shape,
        name="resnet50",
    )
    x = layers.GlobalAveragePooling2D(name="gap")(backbone.output)
    x = layers.Dense(512, activation="relu", name="fc_512")(x)
    x = layers.Dropout(dropout_rate, name="dropout_fc")(x)
    x = layers.Dense(256, activation="relu", name="fc_256")(x)
    x = layers.Dense(128, activation="relu", name="fc_128")(x)
    x = layers.Dense(64, activation="relu", name="fc_64")(x)
    x = layers.Dense(32, activation="relu", name="fc_32")(x)
    x = layers.BatchNormalization(name="batch_norm_head")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)
    model = models.Model(inputs=backbone.input, outputs=outputs, name="resnet50_bohlol")
    model.backbone = backbone  # type: ignore[attr-defined]
    return model


def _is_head_layer(layer: tf.keras.layers.Layer) -> bool:
    return layer.name in HEAD_LAYER_NAMES


def set_resnet_trainable(model: tf.keras.Model, trainable: bool, unfreeze_last_n: int = 0) -> None:
    """Freeze/unfreeze ResNet50 backbone; head layers always trainable when trainable=True."""
    backbone = getattr(model, "backbone", None)
    if backbone is None:
        # Loaded .h5 — freeze all non-head layers
        for layer in model.layers:
            if _is_head_layer(layer):
                layer.trainable = True
            else:
                layer.trainable = trainable
        return

    if not trainable:
        backbone.trainable = False
        for layer in model.layers:
            if _is_head_layer(layer):
                layer.trainable = True
        return

    backbone.trainable = True
    if unfreeze_last_n > 0:
        for layer in backbone.layers:
            layer.trainable = False
        for layer in backbone.layers[-unfreeze_last_n:]:
            layer.trainable = True
    for layer in model.layers:
        if _is_head_layer(layer):
            layer.trainable = True


def compile_bohlol(model: tf.keras.Model, learning_rate: float = 1e-4) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
