package com.sba.nutricanbe.ai.util;

import com.sba.nutricanbe.ai.catalog.NutriHomeCatalog;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Per-dish LLaVA prompts with NutriHome PDF macros and visual disambiguation rules.
 * Loaded from ResNetFoodDefaults — Ollama runs locally on the developer machine.
 */
public final class LlavaMealPromptBuilder {

    private static final Map<String, DishGuide> DISH_GUIDES = buildGuides();

    private LlavaMealPromptBuilder() {
    }

    public static String buildPrompt(String resnetFoodCode, String resnetDisplayName) {
        String code = resnetFoodCode != null ? resnetFoodCode.trim().toLowerCase() : "unknown";
        String hint = resnetDisplayName != null && !resnetDisplayName.isBlank()
                ? resnetDisplayName : code;

        String focusBlock = focusBlockFor(code);
        String nutrihomeTable = nutrihomeReferenceTable();
        String confusionRules = confusionPairRules();

        return """
                You are a Vietnamese nutrition expert helping fitness students track calories accurately.
                Analyze this meal photo. ResNet CNN hint (often WRONG — verify visually): %s (%s).

                %s

                %s

                %s

                Return ONLY valid JSON, no markdown:
                {
                  "food_name_vi": "exact Vietnamese dish name",
                  "food_code_guess": "com_tam|pho|banh_mi|banh_xeo|banh_khot|ca_kho_to|goi_cuon|bun_dau_mam_tom|banh_chung|banh_trang_nuong|unknown",
                  "items": [{"name":"component","estimated_grams":150,"role":"main|side|rice|protein|broth"}],
                  "total_estimated_grams": 350,
                  "portion_description": "describe visible portion e.g. 1 full plate / 1 bowl",
                  "confidence": 0.85,
                  "calories": 529,
                  "protein_g": 21,
                  "fat_g": 13,
                  "carb_g": 82
                }

                Rules:
                - Use NutriHome reference kcal for ONE standard serving, then scale by estimated grams.
                - com_tam serving = 350g ~529 kcal; pho serving = 500g ~414 kcal.
                - Estimate total_estimated_grams from plate/bowl fill level (small=0.7x, large=1.3x standard).
                - confidence < 0.5 if blurry or multiple dishes; 0.7+ only when dish is clear.
                - NEVER guess banh_khot when you see broken rice + pork chop (that is com_tam).
                """.formatted(code, hint, focusBlock, nutrihomeTable, confusionRules);
    }

    private static String focusBlockFor(String resnetCode) {
        Optional<DishGuide> hinted = Optional.ofNullable(DISH_GUIDES.get(resnetCode));
        if (hinted.isPresent() && !"unknown".equals(resnetCode)) {
            return "### Focus (ResNet hint — verify)\n" + hinted.get().toPromptSection();
        }
        return "### Priority dishes (student photos often confuse these)\n"
                + DISH_GUIDES.get("com_tam").toPromptSection() + "\n"
                + DISH_GUIDES.get("pho").toPromptSection();
    }

    private static String nutrihomeReferenceTable() {
        String block = NutriHomeCatalog.llavaMacroReferenceBlock();
        if (block != null && !block.isBlank()) {
            return "### NutriHome PDF reference (1 standard serving)\n" + block;
        }
        return "### NutriHome PDF reference (1 standard serving)\n"
                + DISH_GUIDES.values().stream()
                .distinct()
                .map(DishGuide::macroLine)
                .collect(Collectors.joining("\n"));
    }

    private static String confusionPairRules() {
        return """
                ### Common misclassification pairs (check carefully)
                | ResNet often wrong | Actually looks like | food_code_guess |
                | banh_khot | Broken rice + grilled pork chop + pickles | com_tam |
                | ca_kho_to | Broken rice plate, NOT fish in clay pot | com_tam |
                | banh_khot | Pho noodles in broth with beef | pho |
                | com_tam | Small yellow mini-pancakes in round molds | banh_khot |
                | pho | Dark braised fish in small clay pot | ca_kho_to |
                | pho | Crispy yellow crepe folded with shrimp/pork | banh_xeo |
                """;
    }

    private static Map<String, DishGuide> buildGuides() {
        Map<String, DishGuide> m = new LinkedHashMap<>();
        m.put("com_tam", new DishGuide(
                "com_tam", "Cơm tấm sườn",
                350, 529, 21, 13, 82,
                """
                VISUAL: fragmented broken rice (com tam grains), grilled pork chop (suon nuong) \
                or rib, pickled daikon/carrot, cucumber, scallion oil, may have bi/cha/opposite side.
                NOT: round yellow mini-pancakes (banh khot), NOT noodle soup (pho), NOT fish clay pot.
                Grams: rice ~200g + suon ~80-120g + sides ~50g → total 300-400g typical plate.
                """));
        m.put("pho", new DishGuide(
                "pho", "Phở bò tái",
                500, 414, 18, 12, 59,
                """
                VISUAL: white/beige flat rice noodles IN clear/beef broth, rare beef slices (bo tai), \
                green onion, cilantro, lime, bean sprouts on side. Served in deep bowl.
                NOT: dry broken rice plate (com_tam), NOT small yellow pancakes (banh_khot).
                Grams: broth+noodles+meat ~450-550g per bowl.
                """));
        m.put("banh_khot", new DishGuide(
                "banh_khot", "Bánh khọt",
                150, 154, 6, 7, 17,
                """
                VISUAL: many small round yellow crispy mini-pancakes in special mold pan, \
                topped with shrimp/pork, served with herbs. NO broken rice, NO pork chop.
                """));
        m.put("banh_xeo", new DishGuide(
                "banh_xeo", "Bánh xèo",
                180, 517, 15, 19, 71,
                """
                VISUAL: large crispy yellow turmeric crepe, folded, stuffed with shrimp/pork/bean sprouts.
                """));
        m.put("ca_kho_to", new DishGuide(
                "ca_kho_to", "Cá kho tộ",
                350, 280, 35, 12, 8,
                """
                VISUAL: caramelized braised fish chunks in small clay pot (to), dark sauce, black pepper.
                NOT: rice plate with pork chop (com_tam).
                """));
        m.put("banh_mi", new DishGuide("banh_mi", "Bánh mì", 250, 240, 8, 1, 51,
                "VISUAL: Vietnamese baguette sandwich with fillings."));
        m.put("goi_cuon", new DishGuide("goi_cuon", "Gỏi cuốn", 120, 116, 10, 4, 11,
                "VISUAL: fresh rice paper rolls, translucent, shrimp/pork/herbs visible."));
        m.put("bun_dau_mam_tom", new DishGuide("bun_dau_mam_tom", "Bún đậu mắm tôm", 400, 760, 58, 45, 49,
                "VISUAL: rice vermicelli, fried tofu, pork, shrimp paste sauce on tray."));
        m.put("banh_chung", new DishGuide("banh_chung", "Bánh chưng", 200, 408, 15, 6, 75,
                "VISUAL: square green banana-leaf wrapped sticky rice cake."));
        m.put("banh_trang_nuong", new DishGuide("banh_trang_nuong", "Bánh tráng trộn", 200, 300, 5, 16, 33,
                "VISUAL: grilled rice paper pizza-style snack with toppings."));
        return m;
    }

    private record DishGuide(
            String code, String nameVi,
            int servingG, int kcal, int protein, int fat, int carb,
            String visual) {

        String macroLine() {
            return "- " + nameVi + " (" + code + "): " + servingG + "g → "
                    + kcal + " kcal, P" + protein + "g F" + fat + "g C" + carb + "g";
        }

        String toPromptSection() {
            return "**" + nameVi + "** [" + code + "]\n" + visual.trim() + "\n" + macroLine();
        }
    }
}

