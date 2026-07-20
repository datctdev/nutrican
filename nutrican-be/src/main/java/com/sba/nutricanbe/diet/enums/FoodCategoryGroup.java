package com.sba.nutricanbe.diet.enums;

public enum FoodCategoryGroup {
    PROTEIN("Đạm"),
    CARB("Tinh bột"),
    FAT("Chất béo"),
    VEG("Rau củ"),
    FRUIT("Trái cây"),
    OTHER("Khác");

    private final String labelVi;

    FoodCategoryGroup(String labelVi) {
        this.labelVi = labelVi;
    }

    public String getLabelVi() {
        return labelVi;
    }
}
