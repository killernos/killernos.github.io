// Reviewed public research records for bounded NEXT firmware comparison.
// These records are SOURCE_CONFIRMED only. They are not hardware observations and do not prove exploitation.
export const REVIEWED_SOURCE_RECORDS = Object.freeze([
 {firmware:'13.00',key:'bdj_cve_2025_64390_public_status',value:'AFFECTED_PUBLICLY_DOCUMENTED',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.02',key:'bdj_cve_2025_64390_public_status',value:'AFFECTED_PUBLICLY_DOCUMENTED',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.04',key:'bdj_cve_2025_64390_public_status',value:'PATCHED_BEGINNING_13_04',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.00',key:'netcontrol_public_support',value:'REPORTED_SUPPORTED',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.02',key:'netcontrol_public_support',value:'NOT_PUBLICLY_SUPPORTED',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.04',key:'suid_scanner_public_artifact',value:'ISO_AND_USB_OUTPUT_CLAIM',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.50',key:'public_observation_density',value:'FEW_RAW_PUBLIC_OBSERVATIONS',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false},
 {firmware:'13.52',key:'kqueue_public_experiment',value:'CRASH_WITHOUT_SPRAY_5_OF_5_SURVIVAL_ONE_SPRAY_ZERO_KERNEL_POINTER_LEAKS',evidenceClass:'SOURCE_CONFIRMED',hardwareObserved:false}
]);

export function getReviewedSourceRecords(){return REVIEWED_SOURCE_RECORDS.map(record=>({...record}));}
