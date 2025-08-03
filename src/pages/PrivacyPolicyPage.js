import React from 'react';
import { Typography, Box, Container, Divider } from '@mui/material';
import Layout from '../components/Layout';

const PrivacyPolicyPage = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            개인정보처리방침
          </Typography>
          <Typography variant="body2" color="text.secondary">
            최종 업데이트: 2025년 7월 31일
          </Typography>
        </Box>

        <Box sx={{ '& > *': { mb: 4 } }}>
          {/* Introduction */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              1. 개인정보 수집 및 이용 목적
            </Typography>
            <Typography variant="body1" paragraph>
              TimeCheck(이하 "서비스")는 그룹 일정 조율 서비스를 제공하기 위해 다음과 같은 개인정보를 수집 및 이용합니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li>사용자 계정 생성 및 관리</li>
              <li>일정 조율 서비스 제공</li>
              <li>캘린더 연동 서비스 제공</li>
              <li>서비스 개선 및 고객 지원</li>
            </Typography>
          </Box>

          <Divider />

          {/* Information Collection */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              2. 수집하는 개인정보 항목
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              필수 정보
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><strong>Google 로그인 시:</strong> 이메일 주소, 이름, 프로필 사진</li>
              <li><strong>게스트 모드 시:</strong> 입력한 이름</li>
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              선택 정보
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li><strong>Google Calendar 연동:</strong> 
                <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                  <li>Google 계정 기본 정보 (이메일, 이름)</li>
                  <li>Google Calendar 읽기 권한 (calendar.readonly 스코프)</li>
                  <li>캘린더 일정 데이터 (제목, 시간, 반복 설정)</li>
                  <li>캘린더 목록 및 메타데이터</li>
                </ul>
              </li>
              <li><strong>Apple Calendar 연동:</strong> Apple ID, 앱 암호, 일정 정보</li>
              <li><strong>서비스 이용 정보:</strong> 생성한 이벤트, 가능한 시간대 선택 정보</li>
            </Typography>
          </Box>

          <Divider />

          {/* Data Storage and Security */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              3. 개인정보 보관 및 보안
            </Typography>
            <Typography variant="body1" paragraph>
              수집된 개인정보는 Google Firebase를 통해 안전하게 저장되며, 다음과 같은 보안 조치를 적용합니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li>모든 데이터는 HTTPS를 통해 암호화하여 전송</li>
              <li>캘린더 인증 정보는 AES-256 암호화로 저장</li>
              <li>Firebase 보안 규칙을 통한 접근 제어</li>
              <li>정기적인 보안 점검 및 업데이트</li>
            </Typography>
          </Box>

          <Divider />

          {/* Google User Data */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              3. Google 사용자 데이터 처리
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              Google API 사용 목적
            </Typography>
            <Typography variant="body1" paragraph>
              TimeCheck는 다음 목적으로만 Google 사용자 데이터에 접근합니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><strong>일정 충돌 방지:</strong> 기존 Google Calendar 일정과 겹치지 않는 시간 확인</li>
              <li><strong>가용 시간 표시:</strong> 사용자의 바쁜 시간대를 자동으로 표시하여 일정 조율 효율성 향상</li>
              <li><strong>개인화된 서비스:</strong> 사용자별 캘린더 설정에 맞춘 시간대 추천</li>
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              Google 데이터 사용 원칙
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3, mb: 2 }}>
              <li>사용자가 명시적으로 동의한 경우에만 데이터 접근</li>
              <li>필요한 최소한의 데이터만 요청 (calendar.readonly 스코프만 사용)</li>
              <li>Google Calendar 데이터는 읽기 전용으로만 사용</li>
              <li>사용자의 캘린더를 수정하거나 새 일정을 생성하지 않음</li>
              <li>Google API Terms of Service 및 Developer Policy 완전 준수</li>
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              Google 데이터 저장 및 보관
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3, mb: 2 }}>
              <li><strong>임시 저장:</strong> 캘린더 데이터는 세션 중에만 임시 저장되며, 세션 종료 시 즉시 삭제</li>
              <li><strong>영구 저장 금지:</strong> Google Calendar의 일정 내용은 영구 저장하지 않음</li>
              <li><strong>인증 토큰:</strong> OAuth 토큰은 암호화되어 저장되며, 사용자가 연동 해제 시 즉시 삭제</li>
              <li><strong>제3자 공유 금지:</strong> Google 사용자 데이터를 제3자와 공유하지 않음</li>
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              사용자 권리 및 제어
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li>설정 페이지에서 언제든지 Google Calendar 연동 해제 가능</li>
              <li>연동 해제 시 모든 Google 데이터 및 토큰 즉시 삭제</li>
              <li>Google 계정 설정에서 TimeCheck 앱 권한 직접 제거 가능</li>
              <li>데이터 사용에 대한 투명한 정보 제공 및 사용자 제어권 보장</li>
            </Typography>
          </Box>

          <Divider />

          {/* Data Storage and Security */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              4. 개인정보 보관 및 보안
            </Typography>
            <Typography variant="body1" paragraph>
              수집된 개인정보는 Google Firebase를 통해 안전하게 저장되며, 다음과 같은 보안 조치를 적용합니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li>모든 데이터는 HTTPS를 통해 암호화하여 전송</li>
              <li>캘린더 인증 정보는 AES-256 암호화로 저장</li>
              <li>Firebase 보안 규칙을 통한 접근 제어</li>
              <li>정기적인 보안 점검 및 업데이트</li>
            </Typography>
          </Box>

          <Divider />

          {/* Third Party Integration */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              5. 제3자 서비스 연동
            </Typography>
            <Typography variant="body1" paragraph>
              서비스 제공을 위해 다음 제3자 서비스와 연동됩니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li><strong>Google Services:</strong> 로그인, 캘린더 연동</li>
              <li><strong>Apple iCloud:</strong> Apple Calendar 연동 (선택사항)</li>
              <li><strong>Firebase (Google):</strong> 데이터 저장, 인증, 클라우드 함수</li>
            </Typography>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              각 서비스의 개인정보처리방침은 해당 서비스 제공업체의 정책을 따릅니다.
            </Typography>
          </Box>

          <Divider />

          {/* Data Retention */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              6. 개인정보 보유 및 이용 기간
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li><strong>회원 정보:</strong> 회원 탈퇴 시까지</li>
              <li><strong>이벤트 정보:</strong> 사용자가 삭제하거나 계정 탈퇴 시까지</li>
              <li><strong>캘린더 연동 정보:</strong> 사용자가 연동 해제하거나 계정 탈퇴 시까지</li>
              <li><strong>게스트 데이터:</strong> 이벤트 종료 후 90일 이내 자동 삭제</li>
            </Typography>
          </Box>

          <Divider />

          {/* User Rights */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              7. 이용자의 권리
            </Typography>
            <Typography variant="body1" paragraph>
              이용자는 언제든지 다음 권리를 행사할 수 있습니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li>개인정보 열람, 정정, 삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
              <li>캘린더 연동 해제 (설정 페이지에서 가능)</li>
              <li>계정 삭제 및 모든 데이터 삭제</li>
            </Typography>
          </Box>

          <Divider />

          {/* Cookies */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              8. 쿠키 및 로컬 스토리지
            </Typography>
            <Typography variant="body1" paragraph>
              서비스 제공을 위해 다음과 같은 기술을 사용합니다:
            </Typography>
            <Typography variant="body1" component="ul" sx={{ pl: 3 }}>
              <li><strong>인증 쿠키:</strong> 로그인 상태 유지</li>
              <li><strong>보안 토큰:</strong> CSRF 공격 방지</li>
              <li><strong>로컬 스토리지:</strong> 임시 데이터 저장</li>
            </Typography>
          </Box>

          <Divider />

          {/* Policy Changes */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              9. 개인정보처리방침 변경
            </Typography>
            <Typography variant="body1" paragraph>
              개인정보처리방침이 변경될 경우, 서비스 내 공지사항을 통해 사전 안내드립니다. 
              중요한 변경사항의 경우 이메일을 통해 개별 통지할 수 있습니다.
            </Typography>
          </Box>

          <Divider />

          {/* Contact */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              10. 문의처
            </Typography>
            <Typography variant="body1" paragraph>
              개인정보처리방침에 관한 문의사항이나 개인정보 관련 요청사항이 있으시면 
              아래 연락처로 문의해 주시기 바랍니다:
            </Typography>
            <Typography variant="body1" component="div" sx={{ 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              <strong>TimeCheck 개인정보보호책임자</strong><br />
              이메일: hminw18@gmail.com<br />
              처리 기간: 영업일 기준 3일 이내 회신
            </Typography>
          </Box>

          {/* Footer note */}
          <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid', borderColor: 'grey.300' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              이 개인정보처리방침은 2025년 7월 31일부터 적용됩니다.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default PrivacyPolicyPage;