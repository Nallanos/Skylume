# Diff Details

Date : 2025-06-10 17:36:15

Directory /workspaces/Bluesky-copilot

Total : 71 files,  1025 codes, 291 comments, 452 blanks, all 1768 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [CLUSTER\_SUPERCLUSTER\_FIX\_COMPLETE.md](/CLUSTER_SUPERCLUSTER_FIX_COMPLETE.md) | Markdown | 122 | 0 | 63 | 185 |
| [app/controllers/follower\_analysis\_controller.ts](/app/controllers/follower_analysis_controller.ts) | TypeScript | 6 | 1 | 2 | 9 |
| [app/controllers/python\_controller\_methods.ts](/app/controllers/python_controller_methods.ts) | TypeScript | 52 | 6 | 8 | 66 |
| [app/exceptions/handler.ts](/app/exceptions/handler.ts) | TypeScript | 22 | 2 | 4 | 28 |
| [app/middleware/json\_validation\_middleware.ts](/app/middleware/json_validation_middleware.ts) | TypeScript | 52 | 8 | 9 | 69 |
| [app/middleware/request\_debug\_middleware.ts](/app/middleware/request_debug_middleware.ts) | TypeScript | 48 | 6 | 4 | 58 |
| [app/services/follower\_analysis\_service.ts](/app/services/follower_analysis_service.ts) | TypeScript | 153 | 54 | 59 | 266 |
| [config/bodyparser.ts](/config/bodyparser.ts) | TypeScript | 2 | 0 | 0 | 2 |
| [database/migrations/1749490286298\_create\_make\_super\_cluster\_id\_nullables\_table.ts](/database/migrations/1749490286298_create_make_super_cluster_id_nullables_table.ts) | TypeScript | 18 | 6 | 7 | 31 |
| [inertia/pages/AudienceAnalysis.svelte](/inertia/pages/AudienceAnalysis.svelte) | Svelte | -3 | 0 | -1 | -4 |
| [legacy\_tests/test\_python\_endpoints.mjs](/legacy_tests/test_python_endpoints.mjs) | JavaScript | 117 | 10 | 21 | 148 |
| [legacy\_tests/test\_python\_worker\_simulation.mjs](/legacy_tests/test_python_worker_simulation.mjs) | JavaScript | 11 | 1 | 2 | 14 |
| [legacy\_tests/vite.config.ts.timestamp-1739528579583-a722f58fda6f.mjs](/legacy_tests/vite.config.ts.timestamp-1739528579583-a722f58fda6f.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1742476122499-b0a9634360e9d.mjs](/legacy_tests/vite.config.ts.timestamp-1742476122499-b0a9634360e9d.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1742833385049-f28652cb57dfb.mjs](/legacy_tests/vite.config.ts.timestamp-1742833385049-f28652cb57dfb.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1744284482919-cb58b37fc7582.mjs](/legacy_tests/vite.config.ts.timestamp-1744284482919-cb58b37fc7582.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1746723910118-dcc4dfa6611ee.mjs](/legacy_tests/vite.config.ts.timestamp-1746723910118-dcc4dfa6611ee.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1747213133835-a8a230d913cea.mjs](/legacy_tests/vite.config.ts.timestamp-1747213133835-a8a230d913cea.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1747213135348-7fb0c6a6d8d93.mjs](/legacy_tests/vite.config.ts.timestamp-1747213135348-7fb0c6a6d8d93.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [legacy\_tests/vite.config.ts.timestamp-1747319663931-01e64ae971b1c.mjs](/legacy_tests/vite.config.ts.timestamp-1747319663931-01e64ae971b1c.mjs) | JavaScript | -22 | -6 | -1 | -29 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/1\_Pooling/config.json](/python-service/.model_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/1_Pooling/config.json) | JSON | -7 | 0 | 0 | -7 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/README.md](/python-service/.model_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/README.md) | Markdown | -137 | 0 | -36 | -173 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/config\_sentence\_transformers.json](/python-service/.model_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/config_sentence_transformers.json) | JSON | -7 | 0 | 0 | -7 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/modules.json](/python-service/.model_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/modules.json) | JSON | -20 | 0 | 0 | -20 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/sentence\_bert\_config.json](/python-service/.model_cache/hub/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/sentence_bert_config.json) | JSON | -4 | 0 | 0 | -4 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/1\_Pooling/config.json](/python-service/.model_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/1_Pooling/config.json) | JSON | -7 | 0 | 0 | -7 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/README.md](/python-service/.model_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/README.md) | Markdown | -137 | 0 | -36 | -173 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/config\_sentence\_transformers.json](/python-service/.model_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/config_sentence_transformers.json) | JSON | -7 | 0 | 0 | -7 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/modules.json](/python-service/.model_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/modules.json) | JSON | -20 | 0 | 0 | -20 |
| [python-service/.model\_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/sentence\_bert\_config.json](/python-service/.model_cache/hub/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/sentence_bert_config.json) | JSON | -4 | 0 | 0 | -4 |
| [python-service/.model\_cache/models--sentence-transformers--all-MiniLM-L6-v2/.no\_exist/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/adapter\_config.json](/python-service/.model_cache/models--sentence-transformers--all-MiniLM-L6-v2/.no_exist/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/adapter_config.json) | JSON | 0 | 0 | -1 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-MiniLM-L6-v2/.no\_exist/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/added\_tokens.json](/python-service/.model_cache/models--sentence-transformers--all-MiniLM-L6-v2/.no_exist/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/added_tokens.json) | JSON | 0 | 0 | -1 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/config.json](/python-service/.model_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/config.json) | JSON | -24 | 0 | -1 | -25 |
| [python-service/.model\_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/special\_tokens\_map.json](/python-service/.model_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/special_tokens_map.json) | JSON | -1 | 0 | 0 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/tokenizer.json](/python-service/.model_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/tokenizer.json) | JSON | -1 | 0 | 0 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/tokenizer\_config.json](/python-service/.model_cache/models--sentence-transformers--all-MiniLM-L6-v2/snapshots/c9745ed1d9f207416be6d2e6f8de32d1f16199bf/tokenizer_config.json) | JSON | -1 | 0 | 0 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-mpnet-base-v2/.no\_exist/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/adapter\_config.json](/python-service/.model_cache/models--sentence-transformers--all-mpnet-base-v2/.no_exist/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/adapter_config.json) | JSON | 0 | 0 | -1 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-mpnet-base-v2/.no\_exist/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/added\_tokens.json](/python-service/.model_cache/models--sentence-transformers--all-mpnet-base-v2/.no_exist/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/added_tokens.json) | JSON | 0 | 0 | -1 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/config.json](/python-service/.model_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/config.json) | JSON | -23 | 0 | -1 | -24 |
| [python-service/.model\_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/special\_tokens\_map.json](/python-service/.model_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/special_tokens_map.json) | JSON | -1 | 0 | 0 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/tokenizer.json](/python-service/.model_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/tokenizer.json) | JSON | -1 | 0 | 0 | -1 |
| [python-service/.model\_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/tokenizer\_config.json](/python-service/.model_cache/models--sentence-transformers--all-mpnet-base-v2/snapshots/12e86a3c702fc3c50205a8db88f0ec7c0b6b94a0/tokenizer_config.json) | JSON | -1 | 0 | 0 | -1 |
| [python-service/BULK\_WORKER\_TEST\_FINAL\_REPORT.md](/python-service/BULK_WORKER_TEST_FINAL_REPORT.md) | Markdown | -108 | 0 | -51 | -159 |
| [python-service/CLUSTER\_DUPLICATION\_FIX\_COMPLETE.md](/python-service/CLUSTER_DUPLICATION_FIX_COMPLETE.md) | Markdown | 54 | 0 | 25 | 79 |
| [python-service/NUMPY\_ARRAY\_FIX\_REPORT.md](/python-service/NUMPY_ARRAY_FIX_REPORT.md) | Markdown | -104 | 0 | -50 | -154 |
| [python-service/REFACTORING\_COMPLETE\_SUMMARY.md](/python-service/REFACTORING_COMPLETE_SUMMARY.md) | Markdown | -130 | 0 | -31 | -161 |
| [python-service/STABILITY\_IMPROVEMENTS.md](/python-service/STABILITY_IMPROVEMENTS.md) | Markdown | 127 | 0 | 56 | 183 |
| [python-service/ai\_service/models/transformer\_embedder.py](/python-service/ai_service/models/transformer_embedder.py) | Python | 5 | 1 | 1 | 7 |
| [python-service/ai\_service/services/improved\_tag\_generator.py](/python-service/ai_service/services/improved_tag_generator.py) | Python | 110 | 58 | 41 | 209 |
| [python-service/ai\_service/services/tag\_service.py](/python-service/ai_service/services/tag_service.py) | Python | -420 | -87 | -85 | -592 |
| [python-service/ai\_service/services/tagger.py](/python-service/ai_service/services/tagger.py) | Python | 7 | 2 | 2 | 11 |
| [python-service/analysis\_worker.py](/python-service/analysis_worker.py) | Python | 84 | 22 | 23 | 129 |
| [python-service/debug\_tag\_generation.py](/python-service/debug_tag_generation.py) | Python | 63 | 17 | 19 | 99 |
| [python-service/start\_worker\_unified.sh](/python-service/start_worker_unified.sh) | Shell Script | 11 | 4 | 5 | 20 |
| [python-service/test\_cluster\_duplication\_fix.py](/python-service/test_cluster_duplication_fix.py) | Python | 56 | 19 | 22 | 97 |
| [python-service/test\_cluster\_logic\_fix.py](/python-service/test_cluster_logic_fix.py) | Python | 64 | 16 | 21 | 101 |
| [python-service/test\_clustering\_improvements.py](/python-service/test_clustering_improvements.py) | Python | 196 | 30 | 56 | 282 |
| [python-service/test\_final\_cleanup.py](/python-service/test_final_cleanup.py) | Python | 103 | 17 | 35 | 155 |
| [python-service/test\_final\_results.py](/python-service/test_final_results.py) | Python | 39 | 3 | 16 | 58 |
| [python-service/test\_final\_simplified.py](/python-service/test_final_simplified.py) | Python | 81 | 14 | 25 | 120 |
| [python-service/test\_hybrid\_focused.py](/python-service/test_hybrid_focused.py) | Python | 216 | 39 | 66 | 321 |
| [python-service/test\_hybrid\_tag\_generation.py](/python-service/test_hybrid_tag_generation.py) | Python | 212 | 36 | 62 | 310 |
| [python-service/test\_integration.py](/python-service/test_integration.py) | Python | 35 | 10 | 13 | 58 |
| [python-service/test\_no\_hierarchical.py](/python-service/test_no_hierarchical.py) | Python | 81 | 11 | 18 | 110 |
| [python-service/test\_simple\_fix.py](/python-service/test_simple_fix.py) | Python | 23 | 4 | 9 | 36 |
| [python-service/test\_simplified\_tag\_generator.py](/python-service/test_simplified_tag_generator.py) | Python | 75 | 13 | 19 | 107 |
| [python-service/test\_stability\_improvements.py](/python-service/test_stability_improvements.py) | Python | 123 | 19 | 41 | 183 |
| [python-service/test\_tag\_improvements.py](/python-service/test_tag_improvements.py) | Python | -162 | -28 | -44 | -234 |
| [python-service/worker\_health\_monitor.py](/python-service/worker_health_monitor.py) | Python | 112 | 18 | 29 | 159 |
| [start/kernel.ts](/start/kernel.ts) | TypeScript | 2 | 0 | 0 | 2 |
| [test\_local\_ai\_integration.js](/test_local_ai_integration.js) | JavaScript JSX | 49 | 7 | 17 | 73 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details