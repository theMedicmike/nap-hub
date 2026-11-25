-- NAP Atlas: make every source clickable. The PubMed ID and DOI were already written inside each
-- citation's text but never stored in their own fields, so the site could only show plain text.
-- This copies what is literally there into structured fields. It adds nothing new and changes no
-- citation, grade, or claim. Only fills fields that are empty.
alter table atlas_sources add column if not exists pmid text;

update atlas_sources
set pmid = substring(citation || ' ' || coalesce(title, '') from '(?i)PMID[: ]*([0-9]{6,9})')
where pmid is null;

update atlas_sources
set doi = regexp_replace(substring(citation from '(10\.[0-9]{4,9}/[^ ;,)\]]+)'), '[.]+$', '')
where doi is null and citation ~ '10\.[0-9]{4,9}/';

update atlas_sources
set url = case
  when pmid is not null then 'https://pubmed.ncbi.nlm.nih.gov/' || pmid || '/'
  when doi is not null then 'https://doi.org/' || doi
end
where url is null and (pmid is not null or doi is not null);
