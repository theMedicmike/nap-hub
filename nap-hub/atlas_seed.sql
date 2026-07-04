-- NAP Atlas — starter seed (faithful to the Evidence Compendium).
-- Run once in Supabase → SQL Editor. Safe to re-run (idempotent).
-- Evidence tiers use the compendium's own scale: strong | moderate | emerging.
-- 'framework' marks structural (non-evidence) links.

insert into atlas_entities (type, name, slug, summary) values
-- systems
('system','Neurological & cognitive','neurological','The brain and nervous system — a primary target of toxic exposure and inflammation.'),
('system','Immune & inflammatory','immune','Immune regulation and the inflammatory response, including the hematopoietic core.'),
('system','Endocrine & hormonal','endocrine','Hormonal signaling across the lifespan, disrupted by environmental chemicals.'),
('system','Cardiovascular & metabolic','cardiovascular','Heart, vasculature, and energy metabolism.'),
('system','Gut & microbiome','gut','The gut barrier and microbiome, hub of the gut-brain axis.'),
('system','Detoxification','detox','The body''s systems for handling and clearing accumulated toxic burden.'),
('system','Mitochondrial & energy','mitochondrial','Cellular energy production and oxidative balance.'),
('system','Musculoskeletal & structural','structural','Bone, muscle, and connective tissue.'),
-- drivers
('driver','Cumulative toxic burden','toxic-burden','The total body burden of synthetic chemicals carried by modern populations, associated with chronic disease across every category.'),
('driver','Heavy metal burden','heavy-metals','Lead, mercury, arsenic, cadmium, and aluminum — documented neurotoxins acting through multiple mechanisms.'),
('driver','PFAS ("forever chemicals")','pfas','Persistent synthetic compounds with no established safe exposure threshold (EPA set the goal at zero, 2024).'),
('driver','Trichloroethylene (TCE)','tce','A chlorinated industrial solvent linked to neurodegenerative risk decades after exposure.'),
('driver','Benzene','benzene','A Group 1 human carcinogen whose primary target is the blood-forming system.'),
('driver','Endocrine-disrupting chemicals','edcs','Chemicals that interfere with hormonal signaling.'),
('driver','Micronutrient insufficiency','micronutrient-insufficiency','Widespread suboptimal status of essential nutrients with measurable health consequences.'),
('driver','Neuroinflammation','neuroinflammation','Inflammatory activation in the nervous system — a shared mechanism across neurological disease.'),
('driver','Oxidative stress','oxidative-stress','Imbalance between oxidative damage and antioxidant defense.'),
-- conditions
('condition','Parkinson''s disease','parkinsons','A neurodegenerative movement disorder with documented environmental contributors.'),
('condition','Neurodegenerative disease','neurodegeneration','Alzheimer''s and related conditions arising from converging vascular, inflammatory, metabolic, and toxic factors.'),
('condition','Cardiovascular disease','cardiovascular-disease','Emerges from interacting inflammatory, metabolic, hormonal, microbial, and structural factors.'),
('condition','Type 2 diabetes','type-2-diabetes','Metabolic dysfunction interacting with inflammation, microbial imbalance, and hormonal dysregulation.'),
('condition','Acute myeloid leukemia','aml','A blood cancer with an established causal link to benzene exposure.'),
('condition','Mood & anxiety disorders','mood-disorders','Conditions with documented physiological and inflammatory contributors, not purely psychiatric.'),
('condition','Cognitive impairment','cognitive-impairment','Decline in memory, attention, and executive function with multiple physiological drivers.'),
('condition','Autoimmune disease','autoimmune','Emerges from interacting microbial, inflammatory, environmental, and genetic factors.'),
('condition','Metabolic syndrome','metabolic-syndrome','A cluster of metabolic dysfunctions raising cardiovascular and diabetes risk.'),
('condition','Thyroid dysfunction','thyroid-dysfunction','Disrupted thyroid signaling, sensitive to nutrient status and chemical exposure.'),
-- nutrients
('nutrient','Magnesium','magnesium','An essential mineral widely suboptimal in modern populations.'),
('nutrient','Zinc','zinc','An essential mineral central to immune function.'),
('nutrient','Selenium','selenium','A trace mineral important to thyroid and immune function.'),
('nutrient','Vitamin D','vitamin-d','A hormone-like vitamin central to immune regulation.'),
('nutrient','Vitamin K2','vitamin-k2','Involved in calcium handling and vascular/bone health.'),
('nutrient','Vitamin B12','b12','A B vitamin essential to neurological and cognitive function.'),
('nutrient','Folate','folate','A B vitamin central to the homocysteine pathway.'),
('nutrient','Omega-3 fatty acids','omega-3','Essential fats with anti-inflammatory and neurological roles.'),
-- modalities
('modality','Toxic burden reduction','toxic-burden-reduction','Comprehensive assessment and staged mobilization of accumulated toxic load.'),
('modality','Nutritional repletion','nutritional-repletion','Systematic correction of documented nutrient insufficiencies.'),
('modality','Gut restoration','gut-restoration','Restoring the gut barrier and microbiome.'),
('modality','Terrain assessment & testing','terrain-assessment','Comprehensive baseline measurement of exposure and biological terrain.')
on conflict (slug) do nothing;

create unique index if not exists atlas_links_unique
  on atlas_links (from_entity, to_entity, relation);

with L(from_slug, to_slug, relation, tier, notes) as (values
 ('heavy-metals','neurological','produces neurotoxic effects in','strong','Sanders et al., Environmental Health Perspectives; systematic review, Environmental Sciences Europe (2024).'),
 ('heavy-metals','cognitive-impairment','contributes to','strong','Exposure to heavy metals and neurocognitive function in adults: systematic review (2024).'),
 ('heavy-metals','mood-disorders','disrupts dopaminergic & serotonergic signaling in','moderate','Co-exposure to lead, mercury, cadmium (2023), Frontiers in Public Health.'),
 ('heavy-metals','detox','burdens','strong','CDC National Report on Human Exposure to Environmental Chemicals.'),
 ('tce','parkinsons','associated with ~70% higher risk of','moderate','Goldman SM et al. (2023), JAMA Neurology — contaminated-water cohort.'),
 ('benzene','aml','established cause of','strong','IARC Monographs — benzene, Group 1 carcinogen; American Cancer Society.'),
 ('benzene','immune','targets the hematopoietic core of','strong','IARC Monographs — benzene and the hematopoietic system.'),
 ('pfas','thyroid-dysfunction','associated with','strong','U.S. EPA (2024) PFAS drinking-water regulation; peer-reviewed thyroid effects.'),
 ('pfas','immune','associated with effects on','strong','U.S. EPA (2024); peer-reviewed immune, lipid, hepatic, and renal effects.'),
 ('edcs','endocrine','disrupts','strong','Gore AC et al. (2015), EDC-2, Endocrine Society Scientific Statement.'),
 ('edcs','metabolic-syndrome','contributes to','moderate','Trasande L et al. (2015), J Clin Endocrinol Metab.'),
 ('toxic-burden','cardiovascular-disease','associated with increased risk of','strong','Landrigan PJ et al. (2018), Lancet Commission on pollution and health.'),
 ('toxic-burden','type-2-diabetes','associated with increased risk of','strong','Gore AC et al. (2015); Landrigan PJ et al. (2018).'),
 ('toxic-burden','neurodegeneration','associated with increased risk of','strong','Landrigan PJ et al. (2018), Lancet.'),
 ('toxic-burden','autoimmune','associated with increased risk of','strong','Endocrine Society and WHO statements on environmental toxin burden.'),
 ('toxic-burden','detox','is the load carried by','strong','CDC biomonitoring; cumulative risk assessment literature.'),
 ('micronutrient-insufficiency','cardiovascular-disease','contributes to','strong','NHANES population biomarker data; nutrient status reviews.'),
 ('micronutrient-insufficiency','cognitive-impairment','contributes to','moderate','B-vitamin and omega-3 status reviews.'),
 ('neuroinflammation','neurodegeneration','drives','strong','Heneka MT et al. (2015), Lancet Neurology.'),
 ('neuroinflammation','mood-disorders','contributes to','moderate','Inflammatory models of depression (review).'),
 ('oxidative-stress','neurodegeneration','contributes to','moderate','Mitochondrial and oxidative injury models of neurodegeneration.'),
 ('oxidative-stress','cardiovascular-disease','contributes to','moderate','Hotamisligil GS (2017), Nature — metaflammation.'),
 ('parkinsons','neurological','affects','strong',null),
 ('neurodegeneration','neurological','affects','strong',null),
 ('cardiovascular-disease','cardiovascular','affects','strong',null),
 ('type-2-diabetes','cardiovascular','affects','strong',null),
 ('aml','immune','arises in the hematopoietic core of','strong',null),
 ('mood-disorders','neurological','affects','strong',null),
 ('cognitive-impairment','neurological','affects','strong',null),
 ('thyroid-dysfunction','endocrine','affects','strong',null),
 ('metabolic-syndrome','cardiovascular','affects','strong',null),
 ('autoimmune','immune','affects','strong',null),
 ('vitamin-d','immune','supports','strong','NHANES status data; immune-regulatory role of vitamin D.'),
 ('zinc','immune','supports','strong','Established role of zinc in immune function.'),
 ('selenium','thyroid-dysfunction','supports','moderate','Selenium and thyroid function reviews.'),
 ('selenium','immune','supports','moderate','Selenium and immune function.'),
 ('magnesium','cardiovascular-disease','insufficiency associated with','moderate','Magnesium status and cardiovascular risk reviews.'),
 ('omega-3','mood-disorders','supportive evidence for','moderate','Omega-3 and mood — mechanism established, trials limited.'),
 ('omega-3','cognitive-impairment','supportive evidence for','emerging','Omega-3 and cognition — emerging clinical evidence.'),
 ('b12','cognitive-impairment','insufficiency associated with','moderate','B12 and folate status and cognition.'),
 ('folate','cardiovascular-disease','supports (homocysteine pathway)','moderate','Folate, homocysteine, and cardiovascular reviews.'),
 ('toxic-burden-reduction','toxic-burden','addresses','framework',null),
 ('toxic-burden-reduction','heavy-metals','addresses','framework',null),
 ('nutritional-repletion','micronutrient-insufficiency','addresses','framework',null),
 ('nutritional-repletion','magnesium','includes','framework',null),
 ('nutritional-repletion','vitamin-d','includes','framework',null),
 ('nutritional-repletion','omega-3','includes','framework',null),
 ('terrain-assessment','toxic-burden','measures','framework',null),
 ('gut-restoration','gut','restores','framework',null)
)
insert into atlas_links (from_entity, to_entity, relation, evidence_tier, notes)
select f.id, t.id, L.relation, L.tier, L.notes
from L
join atlas_entities f on f.slug = L.from_slug
join atlas_entities t on t.slug = L.to_slug
on conflict (from_entity, to_entity, relation) do nothing;
