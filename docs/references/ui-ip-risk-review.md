# 감정 버블 UI 상용화 지식재산 위험 검토

- 검토일: 2026-08-26
- 대상 참고자료: `2026-08-26-bubble-emotion-map-reference.jpg`
- 확인된 원출처: [How We Feel 공식 사이트](https://howwefeel.org/)
- 상태: 공식 자료 조사와 독립 비관적 AI 검수 완료, 실제 변호사·변리사 의견 및 권리검색 미실시

> 이 문서는 개발 의사결정을 위한 위험 정리이며 법률의견이 아니다. 한국 상용 출시 전에는 저작권·부정경쟁 전문 변호사와 변리사의 화면 대조 및 권리검색을 받아야 한다. 해외 앱스토어 배포는 배포국 법률을 별도로 검토한다.

## 결론

`감정을 원형 공간에서 탐색한다`, `색으로 분류한다`, `손가락으로 이동한다`는 추상적인 아이디어나 기능만으로 곧바로 독점되는 것은 아니다. 하지만 참고 화면은 `How We Feel`의 실제 상용 앱 화면이며, 같은 감정 기록 시장에서 다음 구체적 표현의 조합까지 가깝게 재현하면 위험이 커진다.

- 검은 배경을 가득 채우는 고밀도 원형 패킹
- 빨강·노랑·파랑·초록의 같은 영역 배치와 색조
- 같은 원 크기 분포, 단어의 위계, 가장자리 잘림
- 중앙 정렬 세리프 글꼴과 유사한 단어 배열
- 상단 `X`·`?`·검색 버튼의 위치와 원형 모양
- 같은 이동·관성·선택 확대 동작

Inside Me는 원본을 재현하지 않고 `공간에서 다양한 단어를 발견한다`는 원리만 참고한다. 구체적인 분류, 색, 도형, 타이포그래피, 배치, 컨트롤과 움직임은 독자 설계한다.

## 위험별 판단

### 저작권 — 중간, 가까운 재현은 높음

한국저작권위원회와 대법원은 저작권이 아이디어 자체가 아니라 구체적인 창작적 표현을 보호한다고 설명한다. 따라서 원형 단어 탐색이라는 아이디어는 참고할 수 있지만, 창작적인 색·배치·글꼴·크기·전체 조합이 실질적으로 유사하면 침해 주장이 가능하다.

- 근거: [한국저작권위원회 아이디어와 표현 상담](https://www.copyright.or.kr/business/counsel/auto-advice-service/practice/detail.do?categorySeq=0&categoryType=&counselSeq=3314&parCategorySeq=)
- 근거: [한국저작권위원회 저작권 상식](https://www.copyright.or.kr/information-materials/common-sense/knowledge-for-netizen/index.do)
- 근거: [대법원 2007도7181 — 창작적인 표현 형식 보호](https://www.law.go.kr/LSW/precInfoP.do?mode=0&precSeq=215805)
- GUI 참고: [한국저작권위원회 GUI 저작물성 해외 판례 동향](https://www.copyright.or.kr/information-materials/trend/the-copyright/view.do?brdclasscode=01&brdclasscodeList=&brdctsno=52856&etc1=&etc2=&nationcode=&noticeYn=&pageIndex=21&searchTarget=ALL&searchText=&searchkeyword=)

How We Feel 이용약관은 제품 안의 자료에 관한 권리를 보유하고 제품 밖 복제·수정·배포·2차적 이용을 제한한다고 밝힌다. 원본 스크린샷, 아이콘, 문구, 코드, 색상값을 제품 자산으로 사용하지 않는다.

- 원출처: [How We Feel 이용약관](https://howwefeel.org/terms)
- 원출처·권리자 표시: [How We Feel App Store 정보](https://howwefeel.org/get)

### 화상디자인권 — 등록 여부 확인 전 잠재 위험

한국 디자인보호법은 기기 조작이나 기능 발휘에 이용되는 디지털 `화상`과 그 부분을 디자인으로 보호할 수 있다. 저작권 성립 여부와 별개로 한국 또는 국제 화상디자인 등록이 있으면 유사 화면이 문제가 될 수 있다.

- 근거: [디자인보호법 제2조의 화상 정의](https://law.go.kr/lsInfoP.do?lsiSeq=268579&viewCls=lsRvsDocInfoR)
- 근거: [특허청 화상디자인 심사기준](https://www.kipo.go.kr/ko/contFileDown.do?fileNm=%EB%94%94%EC%9E%90%EC%9D%B8%EC%8B%AC%EC%82%AC%EA%B8%B0%EC%A4%80.pdf&path=%2Fupload%2Fip_info%2Fthickened_20211021.pdf)

현재 조사만으로 `The How We Feel Project, Inc.`와 관련 제작사의 한국·국제 등록디자인 존재 여부를 확정하지 못했다. 출시 전 KIPRIS와 WIPO Hague에서 권리자명, 앱명, GUI·화상디자인 분류로 검색한다.

### 부정경쟁방지법상 성과 도용·혼동 — 중간, 직접 모방은 높음

저작권이나 디자인권으로 보호되지 않는 아이디어는 원칙적으로 자유롭게 이용할 수 있지만, 타인의 상당한 투자·노력으로 만든 성과를 창작적 기여 없이 대부분 가져와 상업적으로 이용하는 특별한 사정이 있으면 부정경쟁행위가 될 수 있다. 같은 감정 기록 시장이고 참고물을 실제로 본 사실이 있으므로, 최종 화면의 전체 인상이 가까우면 위험이 높아진다.

- 근거: [부정경쟁방지 및 영업비밀보호에 관한 법률](https://law.go.kr/lsInfoP.do?ancYnChk=0&lsId=000308)
- 근거: [대법원 판례 — 성과 이용의 현저한 불공정성 판단](https://law.go.kr/LSW/precInfoP.do?precSeq=186411)
- 근거: [대법원 판례 — 아이디어 자유 이용과 보충적 일반조항](https://www.law.go.kr/LSW/precInfoP.do?precSeq=208900)

한국에 미국의 trade dress와 완전히 같은 독립 권리가 있는 것은 아니지만, 이름·로고·화면 전체 인상이 원본의 한국판·제휴 앱으로 오인될 정도면 상표·영업표지 혼동 위험도 커진다.

## Inside Me 차별화 기준

- 원본의 검은 배경과 4색 사분면 대신 밝은 크림 바탕과 `충족 감정 / 미충족 감정 / 욕구` 3개 흐름을 쓴다.
- 완전한 원 패킹을 그대로 재현하지 않고 마음의 섬·조약돌·잔물결처럼 Inside Me만의 공간 언어를 만든다.
- 한국어 산세리프, 독자적인 제목·설명·선택 선반과 다른 컨트롤 위치를 사용한다.
- 원본의 감정 단어, 정의, 분류와 배열을 복제하지 않고 프로젝트가 구조화한 한국어 271개 카탈로그의 출처와 변경 근거를 관리한다.
- 배치 알고리즘, 반응형 규칙, 선택 애니메이션을 자체 작성하고 설계 스케치·토큰·날짜별 변경 이력을 보존한다.
- 검색·목록·TalkBack·모션 감소 경로를 포함해 원본과 다른 정보 구조와 접근성을 만든다.

## 출시 전 필수 확인

- [ ] KIPRIS에서 `How We Feel`, `The How We Feel Project, Inc.`와 공개 제작사 명의의 국내 상표·화상디자인 검색
- [ ] WIPO Global Brand Database와 Hague Express에서 국제 상표·디자인 검색
- [ ] 원본과 최종 화면을 배경·팔레트·도형·타이포·배치·컨트롤·동작별로 나란히 대조
- [ ] 원본 스크린샷·아이콘·폰트·코드·문구·색상값이 빌드 자산에 포함되지 않았는지 검사
- [ ] 한국어 감정·욕구 목록과 설명의 출처·이용 가능성 확인
- [ ] 독자 설계 스케치, 디자인 토큰, 알고리즘, 결정 로그와 커밋 이력 보존
- [ ] 앱 이름·로고·스토어 스크린샷이 원본의 제휴·공식 한국판으로 오인되지 않는지 확인
- [ ] 한국 출시 전 변호사·변리사에게 최종 화면 대조와 권리검색 의뢰
- [ ] 해외 배포 전 주요 배포국의 저작권·design patent/design right·trade dress 검토

원본에 가까운 재현이 제품상 반드시 필요하면 추정에 기대지 않고 권리자에게 서면 이용허락을 문의한다.
